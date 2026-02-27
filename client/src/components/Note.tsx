import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  NOTE_COLORS,
  type Note,
  type NoteColor,
  type UpdateNotePayload,
} from "../types";
import { ColorPicker } from "./ColorPicker";

interface Props {
  note: Note;
  isDragging: boolean;
  isOverTrash: boolean;
  autoFocus: boolean;
  onDragStart: (
    noteId: string,
    type: "move" | "resize",
    e: React.MouseEvent,
    note: Note,
  ) => void;
  onUpdate: (id: string, payload: UpdateNotePayload) => void;
}

export const NoteCard = memo(function NoteCard({
  note,
  isDragging,
  isOverTrash,
  autoFocus,
  onDragStart,
  onUpdate,
}: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when this note is newly created
  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  const handleMoveStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (showColorPicker) setShowColorPicker(false);
      onDragStart(note.id, "move", e, note);
    },
    [note, onDragStart, showColorPicker],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onDragStart(note.id, "resize", e, note);
    },
    [note, onDragStart],
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(note.id, { content: e.target.value });
    },
    [note.id, onUpdate],
  );

  const handleColorChange = useCallback(
    (color: NoteColor) => {
      onUpdate(note.id, { color });
      setShowColorPicker(false);
    },
    [note.id, onUpdate],
  );

  const bgColor = NOTE_COLORS[note.color];

  // Elevate z-index when color picker is open so it isn't obscured by sibling notes
  const zIndex = isDragging ? 1000 : showColorPicker ? 100 : 1;

  const classNames = [
    "note",
    isDragging ? "note--dragging" : "",
    isOverTrash ? "note--over-trash" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        "--note-bg": bgColor,
        zIndex,
      } as React.CSSProperties}
    >
      {/* Header acts as the move drag handle */}
      <div
        className="note__header"
        onMouseDown={handleMoveStart}
        title="Drag to move"
      >
        <button
          className="note__color-btn"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setShowColorPicker((v) => !v)}
          title="Change color"
          style={{ background: bgColor }}
        />
      </div>

      {showColorPicker && (
        <ColorPicker
          current={note.color}
          onChange={handleColorChange}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      <textarea
        ref={textareaRef}
        className="note__content"
        value={note.content}
        onChange={handleContentChange}
        placeholder="Write something..."
        onMouseDown={(e) => e.stopPropagation()}
        spellCheck
      />

      {/* Resize handle — bottom-right corner */}
      <div
        className="note__resize"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />
    </div>
  );
});
