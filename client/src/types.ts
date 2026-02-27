export const NOTE_COLORS = {
  yellow: "#fef9c3",
  blue: "#dbeafe",
  pink: "#fce7f3",
  green: "#dcfce7",
  orange: "#ffedd5",
  purple: "#f3e8ff",
} as const;

export type NoteColor = keyof typeof NOTE_COLORS;

export interface Note {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: NoteColor;
  createdAt: number;
  updatedAt: number;
}

export interface CreateNotePayload {
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: NoteColor;
}

export interface UpdateNotePayload {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  content?: string;
  color?: NoteColor;
}
