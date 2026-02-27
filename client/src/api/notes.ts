import type { Note, CreateNotePayload, UpdateNotePayload } from "../types";

const BASE = "/api/notes";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const notesApi = {
  getAll: (): Promise<Note[]> => request<Note[]>(BASE),

  create: (payload: CreateNotePayload): Promise<Note> =>
    request<Note>(BASE, { method: "POST", body: JSON.stringify(payload) }),

  update: (id: string, payload: UpdateNotePayload): Promise<Note> =>
    request<Note>(`${BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  delete: (id: string): Promise<void> =>
    request<void>(`${BASE}/${id}`, { method: "DELETE" }),
};
