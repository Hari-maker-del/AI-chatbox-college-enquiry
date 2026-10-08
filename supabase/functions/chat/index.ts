import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 20000;

type ChatMessage = { role: "user" | "assistant"; content: string };

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Request body must be valid JSON.", 400);
    }

    const rawMessages = (body ?? {}) as { messages?: unknown };
    if (!Array.isArray(rawMessages.messages) || rawMessages.messages.length === 0) {
      return jsonError("`messages` must be a non-empty array.", 400);
    }
    if (rawMessages.messages.length > MAX_MESSAGES) {
      return jsonError(`Too many messages in one request (max ${MAX_MESSAGES}).`, 400);
    }

    const messages: ChatMessage[] = [];
    let totalChars = 0;

    for (const entry of rawMessages.messages) {
      if (typeof entry !== "object" || entry === null) {
        return jsonError("Each message must be an object.", 400);
      }

      const candidate = entry as { role?: unknown; content?: unknown };
      if (
        (candidate.role !== "user" && candidate.role !== "assistant") ||
        typeof candidate.content !== "string"
      ) {
        return jsonError("Messages may only contain user/assistant roles and string content.", 400);
      }

      if (candidate.content.length > MAX_MESSAGE_CHARS) {
        return jsonError(`A message exceeds the ${MAX_MESSAGE_CHARS} character limit.`, 400);
      }

      totalChars += candidate.content.length;
      messages.push({ role: candidate.role, content: candidate.content });
    }

    if (totalChars > MAX_TOTAL_CHARS) {
      return jsonError(`Total message content exceeds the ${MAX_TOTAL_CHARS} character limit.`, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are the AI assistant for CampusOS, a college digital service platform. Help students and parents with admissions, courses, eligibility, fees, scholarships, campus services, applications, appointments, support, and general college information. Be concise, professional, and clear. Never invent college-specific fees, deadlines, contact details, policies, eligibility cutoffs, or other facts. When authoritative campus data is unavailable, clearly say that the information needs confirmation from the college administration.",
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonError("Rate limit exceeded. Please try again later.", 429);
      }
      if (response.status === 402) {
        return jsonError("AI service requires payment. Please add credits.", 402);
      }
      console.error("AI gateway error:", response.status);
      return jsonError("AI service error. Please try again later.", 502);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e instanceof Error ? e.message : "Unknown error");
    return jsonError("Unable to process the chat request.", 500);
  }
});