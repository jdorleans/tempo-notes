import { Board } from "./components/Board";
import { useNotes } from "./hooks/useNotes";
import "./styles/globals.css";

export function App() {
  const { notes, isLoading, addNote, updateNote, removeNote } = useNotes();

  return (
    <div className="app">
      <Board
        notes={notes}
        isLoading={isLoading}
        onAddNote={addNote}
        onUpdateNote={updateNote}
        onRemoveNote={removeNote}
      />
    </div>
  );
}
