export default function Board({ board }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(10, 4rem)",
      gridTemplateRows: "repeat(10, 4rem)",
      gap: "2px",
      background: "#222",
      padding: "2px",
      borderRadius: "12px"
      
    }}>
      {board.map((row, y) =>
        row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            style={{
              width: "4rem",
              height: "4rem",
              background: cell ? "#4fc3f7" : "#333",
              borderRadius: "10px"
            }}
          />
        ))
      )}
    </div>
  );
}