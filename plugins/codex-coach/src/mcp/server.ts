#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { buildCliInvocation, toolDefinitions, type JsonObject } from "./tools";

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: JsonObject;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

const SERVER_NAME = "codex-coach";
const SERVER_VERSION = "0.1.0";
const DEFAULT_PROTOCOL_VERSION = "2024-11-05";
const pluginRoot = path.resolve(__dirname, "..", "..");
const cliPath = path.join(pluginRoot, "bin", "codex-coach");
let framing: "line" | "headers" = "line";
let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  parseIncomingMessages();
});

process.stdin.on("end", () => {
  parseIncomingMessages(true);
});

function parseIncomingMessages(flush = false): void {
  if (buffer.startsWith("Content-Length:")) {
    framing = "headers";
    parseHeaderFramedMessages();
    return;
  }

  let newlineIndex = buffer.indexOf("\n");
  while (newlineIndex >= 0) {
    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);
    if (line.length > 0) {
      void handleRawMessage(line);
    }

    newlineIndex = buffer.indexOf("\n");
  }

  if (flush && buffer.trim().length > 0) {
    const line = buffer.trim();
    buffer = "";
    void handleRawMessage(line);
  }
}

function parseHeaderFramedMessages(): void {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    const separatorLength = headerEnd >= 0 ? 4 : 2;
    const fallbackHeaderEnd = headerEnd >= 0 ? headerEnd : buffer.indexOf("\n\n");
    if (fallbackHeaderEnd < 0) {
      return;
    }

    const headerText = buffer.slice(0, fallbackHeaderEnd);
    const lengthMatch = /^Content-Length:\s*(\d+)/im.exec(headerText);
    if (!lengthMatch) {
      throw new Error("Missing Content-Length header.");
    }

    const contentLength = Number(lengthMatch[1]);
    const bodyStart = fallbackHeaderEnd + separatorLength;
    const bodyEnd = bodyStart + contentLength;
    if (buffer.length < bodyEnd) {
      return;
    }

    const body = buffer.slice(bodyStart, bodyEnd);
    buffer = buffer.slice(bodyEnd);
    void handleRawMessage(body);
  }
}

async function handleRawMessage(raw: string): Promise<void> {
  let request: JsonRpcRequest;
  try {
    request = JSON.parse(raw) as JsonRpcRequest;
  } catch (error) {
    writeResponse(errorResponse(null, -32700, "Parse error", errorMessage(error)));
    return;
  }

  if (!request.id && request.method?.startsWith("notifications/")) {
    return;
  }

  if (request.id === undefined) {
    return;
  }

  try {
    const result = await handleRequest(request);
    writeResponse({
      jsonrpc: "2.0",
      id: request.id,
      result
    });
  } catch (error) {
    writeResponse(errorResponse(request.id, -32603, errorMessage(error)));
  }
}

async function handleRequest(request: JsonRpcRequest): Promise<unknown> {
  switch (request.method) {
    case "initialize":
      return {
        protocolVersion: readProtocolVersion(request.params),
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION
        }
      };
    case "ping":
      return {};
    case "tools/list":
      return {
        tools: toolDefinitions
      };
    case "tools/call":
      return callTool(request.params);
    case "resources/list":
      return {
        resources: []
      };
    case "prompts/list":
      return {
        prompts: []
      };
    case "logging/setLevel":
      return {};
    default:
      throw new Error(`Unsupported MCP method: ${request.method ?? "<missing>"}`);
  }
}

async function callTool(params: JsonObject | undefined): Promise<unknown> {
  const name = typeof params?.name === "string" ? params.name : null;
  if (!name) {
    throw new Error("tools/call requires params.name.");
  }

  const invocation = buildCliInvocation(name, params?.arguments);
  const result = await runCli(invocation.args, invocation.stdin);
  const isError = result.exitCode !== 0;
  const text = result.stdout.trim().length > 0 ? result.stdout.trim() : result.stderr.trim();

  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    isError
  };
}

function runCli(args: string[], stdin?: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath, args, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"]
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8")
      });
    });

    if (stdin !== undefined) {
      child.stdin.end(stdin);
    } else {
      child.stdin.end();
    }
  });
}

function readProtocolVersion(params: JsonObject | undefined): string {
  return typeof params?.protocolVersion === "string" ? params.protocolVersion : DEFAULT_PROTOCOL_VERSION;
}

function writeResponse(response: JsonRpcResponse): void {
  const payload = JSON.stringify(response);
  if (framing === "headers") {
    process.stdout.write(`Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`);
    return;
  }

  process.stdout.write(`${payload}\n`);
}

function errorResponse(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
