import { useEffect } from "react";
import { NOTE_COLORS, type NoteColor } from "../types";

interface Props {
  current: NoteColor;
  onChange: (color: NoteColor) => void;
  onClose: () => void;
}

export function ColorPicker({ current, onChange, onClose }: Props) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Close when clicking outside this component
      const target = e.target as Element;
      if (!target.closest(".color-picker")) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div className="color-picker" onMouseDown={(e) => e.stopPropagation()}>
      {(Object.entries(NOTE_COLORS) as [NoteColor, string][]).map(
        ([color, value]) => (
          <button
            key={color}
            className={`color-swatch${color === current ? " color-swatch--active" : ""}`}
            style={{ background: value }}
            onClick={() => onChange(color)}
            title={color.charAt(0).toUpperCase() + color.slice(1)}
          />
        ),
      )}
    </div>
  );
}
