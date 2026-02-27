import { useCallback, useRef, useState } from "react";
import type { CreateNotePayload, Note, UpdateNotePayload } from "../types";
import { NoteCard } from "./Note";
import { TrashZone } from "./TrashZone";
import { NOTE_COLORS } from "../types";

const MIN_SIZE = 150;
const CREATE_THRESHOLD = 15; // px — treat as click if drag smaller than this
const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 180;
const DEFAULT_COLOR = "yellow" as const;

interface DragState {
  noteId: string;
  type: "move" | "resize";
  startMouseX: number;
  startMouseY: number;
  startNoteX: number;
  startNoteY: number;
  startWidth: number;
  startHeight: number;
}

interface CreateState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface CreatePreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  notes: Note[];
  isLoading: boolean;
  onAddNote: (payload: CreateNotePayload) => Promise<Note>;
  onUpdateNote: (id: string, payload: UpdateNotePayload) => void;
  onRemoveNote: (id: string) => void;
}

export function Board({
  notes,
  isLoading,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const createRef = useRef<CreateState | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [createPreview, setCreatePreview] = useState<CreatePreview | null>(null);
  // ID of the most-recently created note so NoteCard can auto-focus its textarea
  const [newNoteId, setNewNoteId] = useState<string | null>(null);

  const checkOverTrash = useCallback((mx: number, my: number): boolean => {
    if (!trashRef.current) return false;
    const r = trashRef.current.getBoundingClientRect();
    return mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom;
  }, []);

  // Called from NoteCard on header or resize-handle mousedown
  const handleNoteDragStart = useCallback(
    (
      noteId: string,
      type: "move" | "resize",
      e: React.MouseEvent,
      note: Note,
    ) => {
      e.preventDefault();
      dragRef.current = {
        noteId,
        type,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startNoteX: note.x,
        startNoteY: note.y,
        startWidth: note.width,
        startHeight: note.height,
      };
      setDraggingId(noteId);
      document.body.style.cursor = type === "resize" ? "nwse-resize" : "grabbing";

      const handleMouseMove = (ev: MouseEvent) => {
        const drag = dragRef.current;
        if (!drag) return;

        setIsOverTrash(checkOverTrash(ev.clientX, ev.clientY));

        const dx = ev.clientX - drag.startMouseX;
        const dy = ev.clientY - drag.startMouseY;

        if (drag.type === "move") {
          const board = boardRef.current!.getBoundingClientRect();
          const x = Math.max(
            0,
            Math.min(drag.startNoteX + dx, board.width - drag.startWidth),
          );
          const y = Math.max(
            0,
            Math.min(drag.startNoteY + dy, board.height - drag.startHeight),
          );
          onUpdateNote(drag.noteId, { x, y });
        } else {
          const width = Math.max(MIN_SIZE, drag.startWidth + dx);
          const height = Math.max(MIN_SIZE, drag.startHeight + dy);
          onUpdateNote(drag.noteId, { width, height });
        }
      };

      const handleMouseUp = (ev: MouseEvent) => {
        // Always clean up listeners first
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const drag = dragRef.current;
        if (drag && checkOverTrash(ev.clientX, ev.clientY)) {
          onRemoveNote(drag.noteId);
        }
        dragRef.current = null;
        setDraggingId(null);
        setIsOverTrash(false);
        document.body.style.cursor = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [checkOverTrash, onUpdateNote, onRemoveNote],
  );

  // Click or drag on the empty board surface creates a new note
  const handleBoardMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== boardRef.current) return;
      e.preventDefault();

      const boardRect = boardRef.current!.getBoundingClientRect();
      const startX = e.clientX - boardRect.left;
      const startY = e.clientY - boardRect.top;

      createRef.current = { startX, startY, currentX: startX, currentY: startY };
      document.body.style.cursor = "crosshair";

      const handleMouseMove = (ev: MouseEvent) => {
        const cr = createRef.current;
        if (!cr) return;
        const rect = boardRef.current!.getBoundingClientRect();
        const cx = ev.clientX - rect.left;
        const cy = ev.clientY - rect.top;
        createRef.current = { ...cr, currentX: cx, currentY: cy };

        const dx = Math.abs(cx - cr.startX);
        const dy = Math.abs(cy - cr.startY);
        if (dx > CREATE_THRESHOLD || dy > CREATE_THRESHOLD) {
          setCreatePreview({
            x: Math.min(cr.startX, cx),
            y: Math.min(cr.startY, cy),
            width: dx,
            height: dy,
          });
        }
      };

      const handleMouseUp = async () => {
        // Remove listeners immediately — never leave them dangling across an await
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        document.body.style.cursor = "";
        const cr = createRef.current;
        createRef.current = null;
        setCreatePreview(null);

        if (!cr) return;

        const dx = Math.abs(cr.currentX - cr.startX);
        const dy = Math.abs(cr.currentY - cr.startY);
        const dragged = dx > CREATE_THRESHOLD || dy > CREATE_THRESHOLD;

        const x = dragged ? Math.min(cr.startX, cr.currentX) : cr.startX;
        const y = dragged ? Math.min(cr.startY, cr.currentY) : cr.startY;
        const width = dragged ? Math.max(MIN_SIZE, dx) : DEFAULT_WIDTH;
        const height = dragged ? Math.max(MIN_SIZE, dy) : DEFAULT_HEIGHT;

        const created = await onAddNote({
          x,
          y,
          width,
          height,
          content: "",
          color: DEFAULT_COLOR,
        });

        // Signal NoteCard to focus its textarea; clear on next tick
        setNewNoteId(created.id);
        setTimeout(() => setNewNoteId(null), 0);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onAddNote],
  );

  return (
    <div
      ref={boardRef}
      className="board"
      onMouseDown={handleBoardMouseDown}
    >
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          isDragging={draggingId === note.id}
          isOverTrash={draggingId === note.id && isOverTrash}
          autoFocus={note.id === newNoteId}
          onDragStart={handleNoteDragStart}
          onUpdate={onUpdateNote}
        />
      ))}

      {createPreview && (
        <div
          className="note-ghost"
          style={{
            left: createPreview.x,
            top: createPreview.y,
            width: createPreview.width,
            height: createPreview.height,
            "--note-bg": NOTE_COLORS[DEFAULT_COLOR],
          } as React.CSSProperties}
        />
      )}

      <TrashZone ref={trashRef} active={draggingId !== null} isOver={isOverTrash} />

      <div className="board-hint">
        {isLoading
          ? "Loading notes…"
          : "Click or drag on the board to create a note · Drag to trash to delete"}
      </div>
    </div>
  );
}
