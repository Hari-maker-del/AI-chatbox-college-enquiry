import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf@1.8.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SECRET_KEY")!;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 200;
const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 180;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function getUser(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

function chunkText(text: string) {
  const normalized = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length);
    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= normalized.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

function pageAwareChunks(pages: string[]) {
  const out: { content: string; page: number }[] = [];
  for (let i = 0; i < pages.length; i++) {
    const chunks = chunkText(pages[i]);
    for (const content of chunks) out.push({ content, page: i + 1 });
  }
  return out;
}

async function embed(session: any, text: string) {
  const result = await session.run(text, {
    mean_pool: true,
    normalize: true,
  });
  return Array.from(result as Iterable<number>);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: "Authentication required." }, 401);

  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (!isAdmin) return json({ error: "Admin access required." }, 403);

  const { documentId } = await req.json().catch(() => ({}));
  if (typeof documentId !== "string") return json({ error: "documentId is required." }, 400);

  const { data: doc, error: docError } = await admin
    .from("knowledge_documents")
    .select("id,title,file_name,storage_path,mime_type,language,category,status")
    .eq("id", documentId)
    .single();

  if (docError || !doc) return json({ error: "Document not found." }, 404);
  if (!doc.storage_path) return json({ error: "Document has no storage path." }, 400);
  if (doc.mime_type !== "application/pdf") return json({ error: "Only PDF documents are supported." }, 400);

  await admin.from("knowledge_documents").update({
    status: "processing",
    error_message: null,
  }).eq("id", documentId);

  try {
    const { data: file, error: downloadError } = await admin.storage
      .from("knowledge-documents")
      .download(doc.storage_path);

    if (downloadError || !file) throw new Error(downloadError?.message || "Unable to download PDF.");
    if (file.size > MAX_BYTES) throw new Error("PDF exceeds the 20 MB processing limit.");

    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    if (pdf.numPages > MAX_PAGES) throw new Error(`PDF exceeds the ${MAX_PAGES}-page processing limit.`);

    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    const chunks = pageAwareChunks(pages);

    if (!chunks.length) throw new Error("No extractable text was found. Scanned/image-only PDFs need OCR before they can be indexed.");

    const model = new Supabase.ai.Session("gte-small");
    const rows = [];
    for (let i = 0; i < chunks.length; i++) {
      const vector = await embed(model, chunks[i].content);
      rows.push({
        document_id: documentId,
        chunk_index: i,
        page_number: chunks[i].page,
        content: chunks[i].content,
        source_title: doc.title,
        source_url: null,
        language: doc.language,
        embedding: JSON.stringify(vector),
      });
    }

    await admin.from("knowledge_chunks").delete().eq("document_id", documentId);
    const { error: insertError } = await admin.from("knowledge_chunks").insert(rows);
    if (insertError) throw insertError;

    const { error: publishError } = await admin.from("knowledge_documents").update({
      status: "published",
      error_message: null,
    }).eq("id", documentId);
    if (publishError) throw publishError;

    await admin.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action: "process_publish",
      entity_type: "knowledge_document",
      entity_id: documentId,
      metadata: { pages: pdf.numPages, chunks: rows.length, embedding_model: "gte-small" },
    });

    return json({ ok: true, pages: pdf.numPages, chunks: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document processing failed.";
    await admin.from("knowledge_documents").update({
      status: "failed",
      error_message: message.slice(0, 1000),
    }).eq("id", documentId);
    await admin.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      action: "process_failed",
      entity_type: "knowledge_document",
      entity_id: documentId,
      metadata: { error: message.slice(0, 500) },
    });
    return json({ error: message }, 422);
  }
});
