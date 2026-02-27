import { useState, useEffect, useCallback, useRef } from "react";
import type { Note, CreateNotePayload, UpdateNotePayload } from "../types";
import { notesApi } from "../api/notes";

const LS_KEY = "sticky-notes-v1";

function loadFromStorage(): Note[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(notes: Note[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage quota errors
  }
}

export interface UseNotesReturn {
  notes: Note[];
  isLoading: boolean;
  addNote: (payload: CreateNotePayload) => Promise<Note>;
  updateNote: (id: string, payload: UpdateNotePayload) => void;
  removeNote: (id: string) => void;
}

export function useNotes(): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>(loadFromStorage);
  const [isLoading, setIsLoading] = useState(true);

  // Always-current ref used inside debounce callbacks to read latest state
  const notesRef = useRef<Note[]>(notes);
  const pendingSync = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Keep ref current and persist to localStorage on every state change
  useEffect(() => {
    notesRef.current = notes;
    saveToStorage(notes);
  }, [notes]);

  // On mount: load from API; fall back to localStorage cache on failure
  useEffect(() => {
    notesApi
      .getAll()
      .then((apiNotes) => setNotes(apiNotes))
      .catch((err) => console.warn("API unavailable, using local cache:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // Clean up all pending timers on unmount
  useEffect(() => {
    return () => {
      pendingSync.current.forEach(clearTimeout);
      pendingSync.current.clear();
    };
  }, []);

  // Debounced API update — reads the latest note state at fire time to avoid
  // stale-payload bugs when many rapid updates occur (e.g. drag moves).
  const scheduleSyncUpdate = useCallback((id: string) => {
    const existing = pendingSync.current.get(id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      const note = notesRef.current.find((n) => n.id === id);
      if (note && !note.id.startsWith("temp-")) {
        // Send full current state; server merges via spread
        const { createdAt: _c, updatedAt: _u, id: _id, ...payload } = note;
        notesApi.update(id, payload).catch(console.error);
      }
      pendingSync.current.delete(id);
    }, 600);

    pendingSync.current.set(id, timer);
  }, []);

  const addNote = useCallback(
    async (payload: CreateNotePayload): Promise<Note> => {
      const optimistic: Note = {
        ...payload,
        id: `temp-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setNotes((prev) => [...prev, optimistic]);

      try {
        const created = await notesApi.create(payload);

        // Preserve any local edits (e.g. position changes) made while the
        // POST was in-flight — only swap the server-assigned id/createdAt.
        setNotes((prev) =>
          prev.map((n) =>
            n.id === optimistic.id
              ? { ...n, id: created.id, createdAt: created.createdAt }
              : n,
          ),
        );

        // Migrate any pending debounce timer from temp ID to real ID so that
        // moves made during creation are still synced to the server.
        const pending = pendingSync.current.get(optimistic.id);
        if (pending) {
          clearTimeout(pending);
          pendingSync.current.delete(optimistic.id);
          scheduleSyncUpdate(created.id);
        }

        return created;
      } catch (err) {
        console.error("Failed to persist note:", err);
        return optimistic;
      }
    },
    [scheduleSyncUpdate],
  );

  const updateNote = useCallback(
    (id: string, payload: UpdateNotePayload) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...payload, updatedAt: Date.now() } : n,
        ),
      );
      scheduleSyncUpdate(id);
    },
    [scheduleSyncUpdate],
  );

  const removeNote = useCallback(
    (id: string) => {
      const timer = pendingSync.current.get(id);
      if (timer) {
        clearTimeout(timer);
        pendingSync.current.delete(id);
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (!id.startsWith("temp-")) {
        notesApi.delete(id).catch(console.error);
      }
    },
    [],
  );

  return { notes, isLoading, addNote, updateNote, removeNote };
}
