# Architecture

## Overview

A monorepo with two packages: a Bun HTTP API server and a Vite/React SPA client. Both run locally; Vite proxies `/api` requests to the server so there are no CORS issues in development.

```
┌─────────────────────────────────────────┐
│  Browser (localhost:5173)               │
│  ┌──────────────────────────────────┐  │
│  │  App                             │  │
│  │  └── Board (canvas + drag mgmt)  │  │
│  │       ├── NoteCard ×N            │  │
│  │       │    ├── header (move)     │  │
│  │       │    ├── textarea          │  │
│  │       │    ├── ColorPicker       │  │
│  │       │    └── resize handle     │  │
│  │       └── TrashZone              │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  useNotes hook                   │  │
│  │  ├── useState (notes[])          │  │
│  │  ├── localStorage (cache)        │  │
│  │  └── REST API sync (debounced)   │  │
│  └──────────────────────────────────┘  │
└────────────────┬────────────────────────┘
                 │ /api (proxied by Vite)
┌────────────────▼────────────────────────┐
│  Bun HTTP Server (localhost:3001)       │
│  In-memory Map<id, Note>               │
│  GET/POST /api/notes                   │
│  PUT/DELETE /api/notes/:id             │
└─────────────────────────────────────────┘
```

## State Management

**`useNotes`** is the single source of truth for note data:

1. **Startup**: load from `localStorage` immediately (instant render), then fetch from API and replace.
2. **Mutations**: apply optimistically to local state → persist to `localStorage` immediately → debounce API sync (600ms).
3. **API unavailable**: graceful degradation — the app functions fully offline using `localStorage`.

## Drag System

All drag logic lives in `Board.tsx` using native DOM events (no library):

- **Create**: `mousedown` on the board element itself → drag to define bounding box → `mouseup` creates note.
  A small drag (< 15px) creates a default-sized note; a larger drag uses the drawn dimensions.
- **Move**: `mousedown` on `.note__header` → record start mouse + note position → `mousemove` computes delta → `mouseup` finalises.
- **Resize**: `mousedown` on `.note__resize` handle → `mousemove` applies delta to width/height with minimum clamping.
- **Trash**: during any drag `mousemove` checks if cursor is inside `TrashZone`'s bounding rect; `mouseup` triggers delete if so.

`dragRef` (a `useRef`) holds the ephemeral drag state without triggering re-renders. React state (`draggingId`, `isOverTrash`) is used only for visual feedback (CSS class changes).

## Performance

- `NoteCard` is wrapped in `React.memo` — only the dragged note re-renders on each `mousemove`.
- API writes are debounced at 600ms; the debounce always reads from `notesRef.current` at fire time to send the current full state, avoiding stale-closure payload bugs.
- `localStorage` writes happen after every React state update via `useEffect`, keeping the cache always fresh without blocking rendering.

## Data Flow

```
User interaction
     │
     ▼
Board / NoteCard event handlers
     │
     ▼
useNotes.updateNote / addNote / removeNote
     │
     ├──► setNotes (React state, triggers re-render)
     │
     ├──► localStorage (via useEffect, synchronous)
     │
     └──► notesApi (debounced fetch, async)
```
