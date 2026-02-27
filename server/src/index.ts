import { serve } from "bun";

interface Note {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

const store = new Map<string, Note>();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function emptyResponse(status = 204): Response {
  return new Response(null, { status, headers: CORS_HEADERS });
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve({
  port: 3001,

  async fetch(req): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    if (method === "OPTIONS") {
      return emptyResponse(204);
    }

    // Collection routes
    if (pathname === "/api/notes") {
      if (method === "GET") {
        const notes = Array.from(store.values()).sort(
          (a, b) => a.createdAt - b.createdAt,
        );
        return jsonResponse(notes);
      }

      if (method === "POST") {
        let body: Omit<Note, "id" | "createdAt" | "updatedAt">;
        try {
          body = (await req.json()) as Omit<Note, "id" | "createdAt" | "updatedAt">;
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }
        const note: Note = {
          ...body,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        store.set(note.id, note);
        return jsonResponse(note, 201);
      }

      return errorResponse("Method not allowed", 405);
    }

    // Item routes
    const match = pathname.match(/^\/api\/notes\/([^/]+)$/);
    if (match) {
      const id = match[1];

      if (method === "PUT") {
        const existing = store.get(id);
        if (!existing) return errorResponse("Not found", 404);
        let body: Partial<Note>;
        try {
          body = (await req.json()) as Partial<Note>;
        } catch {
          return errorResponse("Invalid JSON body", 400);
        }
        const updated: Note = {
          ...existing,
          ...body,
          id,
          updatedAt: Date.now(),
        };
        store.set(id, updated);
        return jsonResponse(updated);
      }

      if (method === "DELETE") {
        if (!store.has(id)) return errorResponse("Not found", 404);
        store.delete(id);
        return emptyResponse(204);
      }

      return errorResponse("Method not allowed", 405);
    }

    return errorResponse("Not found", 404);
  },
});

console.log("Notes API running on http://localhost:3001");
