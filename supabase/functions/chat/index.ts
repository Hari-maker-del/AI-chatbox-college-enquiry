import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

function corsFor(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allow = allowedOrigins.length === 0
    ? "*"
    : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]);
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "X-Knowledge-Sources",
  };
}

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SECRET_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function errorResponse(message: string, status = 400, req?: Request) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...jsonHeaders, ...(req ? corsFor(req) : {}) },
  });
}

function cleanMessages(input: unknown) {
  if (!Array.isArray(input)) throw new Error("messages must be an array");
  if (input.length > 20) {
    throw new Error("Conversation is too long. Start a new conversation.");
  }

  return input.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid message.");
    const role = (item as any).role;
    const content = (item as any).content;

    if (role !== "user" && role !== "assistant") {
      throw new Error("Invalid message role.");
    }
    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 4000
    ) {
      throw new Error("Each message must contain 1-4000 characters.");
    }

    return { role, content: content.trim() };
  });
}

async function getUser(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

async function retrieveKnowledge(query: string) {
  const safe = query.replace(/[%_]/g, " ").slice(0, 160);

  const [knowledge, chunks, faqs, courses, fees] = await Promise.all([
    admin
      .from("knowledge_base")
      .select("id,category,title,content,source_url,language,priority")
      .eq("is_published", true)
      .textSearch("search_vector", query, {
        type: "websearch",
        config: "simple",
      })
      .order("priority", { ascending: false })
      .limit(12),
    admin
      .from("knowledge_chunks")
      .select("content,source_title,source_url,language,knowledge_documents!inner(status)")
      .eq("knowledge_documents.status", "published")
      .textSearch("content", query, { type: "websearch", config: "simple" })
      .limit(10),
    admin
      .from("faqs")
      .select("question,answer")
      .or("question.ilike.%" + safe + "%,answer.ilike.%" + safe + "%")
      .limit(8),
    admin
      .from("courses")
      .select("name,level,duration,annual_fee,description")
      .or("name.ilike.%" + safe + "%,description.ilike.%" + safe + "%")
      .limit(8),
    admin
      .from("fee_structure")
      .select("program,annual_fee,duration,additional_info")
      .or("program.ilike.%" + safe + "%,additional_info.ilike.%" + safe + "%")
      .limit(8),
  ]);

  return [
    ...(knowledge.data || []).map((x: any) => ({
      source: x.title,
      content: x.content,
      url: x.source_url,
    })),
    ...(chunks.data || []).map((x: any) => ({
      source: x.source_title,
      content: x.content,
      url: x.source_url,
    })),
    ...(faqs.data || []).map((x: any) => ({
      source: "FAQ",
      content: x.question + "\n" + x.answer,
      url: null,
    })),
    ...(courses.data || []).map((x: any) => ({
      source: "Course",
      content: JSON.stringify(x),
      url: null,
    })),
    ...(fees.data || []).map((x: any) => ({
      source: "Fee structure",
      content: JSON.stringify(x),
      url: null,
    })),
  ].slice(0, 20);
}

function languageHint(messages: { role: string; content: string }[]) {
  const text = messages
    .filter((x) => x.role === "user")
    .map((x) => x.content)
    .join(" ");

  if (/[\u0B80-\u0BFF]/.test(text)) return "Tamil";
  if (/[\u0900-\u097F]/.test(text)) return "Hindi";
  if (/[\u0C00-\u0C7F]/.test(text)) return "Telugu";
  if (/[\u0D00-\u0D7F]/.test(text)) return "Malayalam";
  if (/[\u0C80-\u0CFF]/.test(text)) return "Kannada";
  return "English";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsFor(req) });
  }

  const started = Date.now();
  let userId: string | null = null;

  try {
    const user = await getUser(req);
    if (!user) {
      return errorResponse("Authentication required.", 401, req);
    }
    userId = user.id;

    const body = await req.json();
    const messages = cleanMessages(body.messages);
    let conversationId =
      typeof body.conversationId === "string" ? body.conversationId : null;
    const language = languageHint(messages);

    if (conversationId) {
      const { data: owned } = await admin
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!owned) conversationId = null;
    }

    const { data: allowed } = await admin.rpc("check_ai_rate_limit", {
      _user_id: user.id,
      _max_requests: 12,
      _window_seconds: 60,
    });

    if (!allowed) {
      await admin.from("ai_usage_events").insert({
        user_id: user.id,
        event_type: "rate_limited",
        category: "chat",
      });
      return errorResponse(
        "Rate limit exceeded. Please try again in a minute.",
        429,
        req,
      );
    }

    await admin.from("ai_usage_events").insert({
      user_id: user.id,
      event_type: "request",
      category: "chat",
    });

    const knowledge = await retrieveKnowledge(
      messages[messages.length - 1].content,
    );

    const context = knowledge.length
      ? knowledge
          .map(
            (x: any) =>
              "[SOURCE: " +
              x.source +
              "]\n" +
              x.content +
              (x.url ? "\nSource: " + x.url : ""),
          )
          .join("\n\n")
      : "No matching verified college information was found.";

    const system =
      "You are the AI College Enquiry Assistant.\n" +
      "Answer using ONLY the verified college information in CONTEXT and the conversation. " +
      "Never invent fees, dates, placement statistics, recruiters, approvals, contact details, facilities, policies, or deadlines. " +
      "If the answer is not in context, say the verified knowledge base does not currently contain that information and suggest contacting the college office. " +
      "Reply in the same language as the student when possible. Target language: " +
      language +
      ". Be concise, clear and professional. " +
      "When context contains sources, cite them inline using the exact format [Source: SOURCE TITLE]. " +
      "Do not claim that you forwarded a question or that someone will reply unless the system explicitly confirms it.\n\n" +
      "CONTEXT:\n" +
      context;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: system }, ...messages],
          stream: true,
          temperature: 0.2,
          max_tokens: 900,
        }),
      },
    );

    if (!upstream.ok || !upstream.body) {
      const status = upstream.status;
      const detail = await upstream.text();
      console.error("AI gateway error", status, detail.slice(0, 500));

      await admin.from("ai_usage_events").insert({
        user_id: user.id,
        event_type: "error",
        category: "gateway",
        latency_ms: Date.now() - started,
      });

      if (status === 429) {
        return errorResponse(
          "AI service rate limit reached. Please try again later.",
          429,
          req,
        );
      }
      if (status === 402) {
        return errorResponse(
          "AI service credits are unavailable.",
          402,
          req,
        );
      }
      return errorResponse("AI service is temporarily unavailable.", 502, req);
    }

    const decoder = new TextDecoder();
    let fullResponse = "";
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            controller.enqueue(value);
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const raw of lines) {
              if (!raw.startsWith("data: ")) continue;
              const payload = raw.slice(6).trim();
              if (payload === "[DONE]") continue;

              try {
                const parsed = JSON.parse(payload);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (typeof delta === "string") fullResponse += delta;
              } catch {
                // Ignore incomplete SSE frames.
              }
            }
          }

          if (userId && fullResponse) {
            let finalConversationId = conversationId;

            if (!finalConversationId) {
              const { data: conversation } = await admin
                .from("conversations")
                .insert({
                  user_id: userId,
                  title:
                    messages
                      .find((m: any) => m.role === "user")
                      ?.content.slice(0, 80) || "New conversation",
                  language,
                })
                .select("id")
                .single();

              finalConversationId = conversation?.id || null;
            }

            if (finalConversationId) {
              await admin.from("messages").insert([
                {
                  conversation_id: finalConversationId,
                  user_id: userId,
                  role: "user",
                  content: messages[messages.length - 1].content,
                },
                {
                  conversation_id: finalConversationId,
                  user_id: userId,
                  role: "assistant",
                  content: fullResponse,
                  model: "google/gemini-3-flash-preview",
                  latency_ms: Date.now() - started,
                },
              ]);
            }

            await admin.from("ai_usage_events").insert({
              user_id: userId,
              event_type: "response",
              category: "chat",
              latency_ms: Date.now() - started,
            });
          }

          controller.close();
        } catch (error) {
          await admin.from("ai_usage_events").insert({
            user_id: userId,
            event_type: "error",
            category: "stream",
            latency_ms: Date.now() - started,
          });
          controller.error(error);
        }
      },
    });

    const sourceHeader = encodeURIComponent(
      JSON.stringify(
        knowledge
          .map((x: any) => ({ title: x.source, url: x.url || null }))
          .filter(
            (x: any, i: number, a: any[]) =>
              a.findIndex(
                (y: any) => y.title === x.title && y.url === x.url,
              ) === i,
          )
          .slice(0, 8),
      ),
    );

    return new Response(stream, {
      headers: {
        ...corsFor(req),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
        "X-Knowledge-Sources": sourceHeader,
      },
    });
  } catch (error) {
    console.error("chat error", error);
    if (userId) {
      await admin.from("ai_usage_events").insert({
        user_id: userId,
        event_type: "error",
        category: "validation",
        latency_ms: Date.now() - started,
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(
      message,
      message.includes("required") ? 401 : 400,
      req,
    );
  }
});
