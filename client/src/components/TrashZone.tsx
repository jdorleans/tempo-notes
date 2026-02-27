import { forwardRef } from "react";

interface Props {
  active: boolean;
  isOver: boolean;
}

export const TrashZone = forwardRef<HTMLDivElement, Props>(
  ({ active, isOver }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          "trash-zone",
          active ? "trash-zone--active" : "",
          isOver ? "trash-zone--over" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Drag note here to delete"
        title="Drop to delete"
      >
        <span className="trash-zone__icon">🗑</span>
        {active && (
          <span className="trash-zone__label">
            {isOver ? "Release to delete" : "Drop to delete"}
          </span>
        )}
      </div>
    );
  },
);

TrashZone.displayName = "TrashZone";
