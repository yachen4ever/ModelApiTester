import { DB } from "./db.ts";
// 前端 HTML 作为内嵌文件导入（dev 下返回真实路径，编译后返回 /$bunfs/ 内嵌路径）
import FRONTEND_HTML_PATH from "./frontend.html" with { type: "file" };
// 模块加载时预读为字符串，serve 时直接返回
const FRONTEND_HTML = await Bun.file(FRONTEND_HTML_PATH).text();

/**
 * Bun HTTP 服务器：REST API + 静态前端
 */

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "";  // 留空则无需认证
const DB_PATH = process.env.DB_PATH || "./model_api_tester.db";
const PORT = parseInt(process.env.PORT || "53080");   // 默认 53080（与内网门户约定）
const HOST = process.env.HOST || "0.0.0.0";           // 默认监听所有网卡

const db = new DB(DB_PATH);

// ============================ 路由 ============================

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers（开发用）
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth-Password",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 简单认证
    if (ACCESS_PASSWORD) {
      const auth = req.headers.get("X-Auth-Password");
      const sessionAuth = url.searchParams.get("token");
      if (auth !== ACCESS_PASSWORD && sessionAuth !== ACCESS_PASSWORD) {
        return json({ error: "Unauthorized" }, 401, corsHeaders);
      }
    }

    // ============================ API 路由 ============================

    // --- 模型配置 ---
    if (path === "/api/configs" && method === "GET") {
      return json(db.listModelConfigs(), 200, corsHeaders);
    }
    if (path === "/api/configs" && method === "POST") {
      const body = await req.json();
      const id = db.createModelConfig(body);
      return json({ id, ...db.getModelConfig(id) }, 201, corsHeaders);
    }
    if (path.match(/^\/api\/configs\/\d+$/) && method === "PUT") {
      const id = parseInt(path.split("/").pop()!);
      const body = await req.json();
      db.updateModelConfig(id, body);
      return json({ id, ...db.getModelConfig(id) }, 200, corsHeaders);
    }
    if (path.match(/^\/api\/configs\/\d+$/) && method === "DELETE") {
      const id = parseInt(path.split("/").pop()!);
      db.deleteModelConfig(id);
      return json({ ok: true }, 200, corsHeaders);
    }

    // --- 会话 ---
    if (path === "/api/conversations" && method === "GET") {
      return json(db.listConversations(), 200, corsHeaders);
    }
    if (path === "/api/conversations" && method === "POST") {
      const body = await req.json();
      const id = db.createConversation(body);
      return json({ id, ...db.getConversation(id) }, 201, corsHeaders);
    }
    if (path.match(/^\/api\/conversations\/\d+$/) && method === "PUT") {
      const id = parseInt(path.split("/").pop()!);
      const body = await req.json();
      db.updateConversation(id, body);
      return json({ id, ...db.getConversation(id) }, 200, corsHeaders);
    }
    if (path.match(/^\/api\/conversations\/\d+$/) && method === "DELETE") {
      const id = parseInt(path.split("/").pop()!);
      db.deleteConversation(id);
      return json({ ok: true }, 200, corsHeaders);
    }

    // --- 消息 ---
    if (path.match(/^\/api\/conversations\/\d+\/messages$/) && method === "GET") {
      const convId = parseInt(path.split("/")[3]);
      return json(db.listMessages(convId), 200, corsHeaders);
    }
    if (path === "/api/messages" && method === "POST") {
      const body = await req.json();
      const id = db.createMessage(body);
      return json({ id }, 201, corsHeaders);
    }
    if (path.match(/^\/api\/conversations\/\d+\/messages$/) && method === "DELETE") {
      const convId = parseInt(path.split("/")[3]);
      db.deleteMessages(convId);
      return json({ ok: true }, 200, corsHeaders);
    }

    // --- 健康检查 ---
    if (path === "/api/health" && method === "GET") {
      return json({ status: "ok", version: "0.1.3" }, 200, corsHeaders);
    }

    // ============================ 静态文件 ============================
    // 所有其他路径返回前端页面
    return serveStatic(path, corsHeaders);
  },
  hostname: HOST,       // 监听地址（默认 0.0.0.0）
  port: PORT,           // 监听端口（默认 53080）
} satisfies Bun.Serve;

// ============================ 辅助函数 ============================

function json(data: any, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function serveStatic(path: string, corsHeaders: Record<string, string>): Response {
  // 前端 HTML 内联（Bun 的 HTML import 返回 HTMLBundle，toString() 取内容）
  return new Response(FRONTEND_HTML.toString(), {
    headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
  });
}

// ============================ 前端 HTML ============================
// import 内联，build --compile 后变成单二进制，运行时无需读取外部文件
