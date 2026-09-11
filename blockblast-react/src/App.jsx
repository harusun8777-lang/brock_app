import { useState } from "react";
import Board from "./components/Board";

function createEmptyBoard() {
  return Array.from({ length: 10}, () =>
    Array.from({ length:10 }, () => 0)
  );
}

export default function App() {
  const [board] = useState(createEmptyBoard());

  return (
    <div>
      <h1>Block Blast React</h1>
      <Board board={board} />
    </div>
  );
}