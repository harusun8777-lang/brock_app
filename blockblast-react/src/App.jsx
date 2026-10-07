import { useEffect, useRef, useState } from 'react'
import './App.css'
import HomeScreen from './HomeScreen.jsx'

const BOARD_SIZE = 8

const SHAPES = [
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 0, col: 2 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
]

const COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#c77dff', '#f4a261']

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null))

const createRandomPiece = () => {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]

  return {
    id: `${Date.now()}-${Math.random()}`,
    color,
    shape,
  }
}

const createInitialPieces = () => Array.from({ length: 3 }, () => createRandomPiece())

const canPieceFitAnywhere = (piece, targetBoard) => {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const fits = piece.shape.every(({ row: shapeRow, col: shapeCol }) => {
        const nextRow = row + shapeRow
        const nextCol = col + shapeCol

        if (nextRow < 0 || nextRow >= BOARD_SIZE || nextCol < 0 || nextCol >= BOARD_SIZE) {
          return false
        }

        return !targetBoard[nextRow][nextCol]
      })

      if (fits) {
        return true
      }
    }
  }

  return false
}

function App() {
  const [hasStarted, setHasStarted] = useState(false)
  const [board, setBoard] = useState(createEmptyBoard)
  const [pieces, setPieces] = useState(createInitialPieces)
  const [selectedPieceId, setSelectedPieceId] = useState(null)
  const [draggingPieceId, setDraggingPieceId] = useState(null)
  const [dragPosition, setDragPosition] = useState(null)
  const [hoverCell, setHoverCell] = useState(null)
  const [placingEnabled, setPlacingEnabled] = useState(false)
  const [selectionLocked, setSelectionLocked] = useState(false)
  const [score, setScore] = useState(0)
  const suppressPieceClickRef = useRef(false)
  const gameOver = hasStarted && pieces.length > 0 && !pieces.some((piece) => canPieceFitAnywhere(piece, board))

  useEffect(() => {
    if (gameOver) {
      setSelectedPieceId(null)
      setSelectionLocked(false)
      return
    }

    if (pieces.length > 0 && !selectedPieceId && !selectionLocked) {
      setSelectedPieceId(pieces[0].id)
    }
  }, [pieces, selectedPieceId, gameOver, selectionLocked])

  const selectedPiece = pieces.find((piece) => piece.id === selectedPieceId) ?? pieces[0]
  const draggedPiece = pieces.find((piece) => piece.id === draggingPieceId)
  const hoveredPiecePreview = draggedPiece ?? selectedPiece

  const canPlacePiece = (piece, anchorRow, anchorCol, targetBoard = board) => {
    return piece.shape.every(({ row, col }) => {
      const nextRow = anchorRow + row
      const nextCol = anchorCol + col

      if (nextRow < 0 || nextRow >= BOARD_SIZE || nextCol < 0 || nextCol >= BOARD_SIZE) {
        return false
      }

      return !targetBoard[nextRow][nextCol]
    })
  }

  const resolveCompletedLines = (nextBoard) => {
    const filledRows = []
    const filledCols = []

    nextBoard.forEach((line, index) => {
      if (line.every(Boolean)) filledRows.push(index)
    })

    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const isFull = nextBoard.every((row) => Boolean(row[col]))
      if (isFull) filledCols.push(col)
    }

    if (filledRows.length === 0 && filledCols.length === 0) {
      return { board: nextBoard, cleared: 0 }
    }

    const clearedBoard = nextBoard.map((row) => [...row])

    filledRows.forEach((rowIndex) => {
      clearedBoard[rowIndex] = Array(BOARD_SIZE).fill(null)
    })

    filledCols.forEach((colIndex) => {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        clearedBoard[row][colIndex] = null
      }
    })

    const cleared = filledRows.length + filledCols.length
    return { board: clearedBoard, cleared }
  }

  const previewCells = hoveredPiecePreview && hoverCell
    ? hoveredPiecePreview.shape.map(({ row, col }) => ({
        row: hoverCell.row + row,
        col: hoverCell.col + col,
      }))
    : []

  const redCells = previewCells.filter(({ row, col }) => {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return true
    }

    return Boolean(board[row]?.[col])
  })

  const handlePieceSelection = (pieceId) => {
    if (gameOver) {
      return
    }

    setSelectedPieceId(pieceId)
    setSelectionLocked(false)
    setPlacingEnabled(true)
    setHoverCell(null)
  }

  const handleCellClick = (row, col, pieceOverride = selectedPiece) => {
    if (gameOver) {
      return
    }

    const pieceToPlace = pieceOverride ?? selectedPiece

    if (!pieceToPlace) {
      return
    }

    if (!canPlacePiece(pieceToPlace, row, col)) {
      return
    }

    const nextBoard = board.map((boardRow) => [...boardRow])

    pieceToPlace.shape.forEach(({ row: shapeRow, col: shapeCol }) => {
      const nextRow = row + shapeRow
      const nextCol = col + shapeCol
      nextBoard[nextRow][nextCol] = pieceToPlace.color
    })

    const { board: cleanedBoard, cleared } = resolveCompletedLines(nextBoard)
    const remainingPieces = pieces.filter((piece) => piece.id !== pieceToPlace.id)
    const bonusByClears = cleared === 0 ? 0 : cleared === 1 ? 25 : cleared === 2 ? 60 : 120
    const placementScore = pieceToPlace.shape.length + bonusByClears

    setBoard(cleanedBoard)
    setScore((current) => current + placementScore)

    if (remainingPieces.length === 0) {
      setPieces(createInitialPieces())
      setSelectedPieceId(null)
      setSelectionLocked(true)
      setPlacingEnabled(false)
      setDraggingPieceId(null)
      setDragPosition(null)
      setHoverCell(null)
      return
    }

    setPieces(remainingPieces)
    setSelectedPieceId(null)
    setSelectionLocked(true)
    setPlacingEnabled(false)
    setHoverCell(null)
  }

  const resetGame = (start = true) => {
    setBoard(createEmptyBoard())
    setPieces(createInitialPieces())
    setSelectedPieceId(null)
    setDraggingPieceId(null)
    setDragPosition(null)
    setPlacingEnabled(false)
    setSelectionLocked(false)
    setScore(0)
    setHasStarted(start)
  }

  if (!hasStarted) {
    return <HomeScreen onStart={() => resetGame(true)} />
  }

  if (gameOver) {
    return (
      <main className="screen-page game-over-screen">
        <div className="home-topline">
          <span className="brand-mark" aria-hidden="true">B</span>
          <span className="home-label">BLOCK BLAST</span>
        </div>

        <section className="game-over-content" aria-labelledby="game-over-title">
          <div className="game-over-art" aria-hidden="true">
            <div className="game-over-ring" />
            <div className="game-over-icon">!</div>
            <span className="game-over-star star-left">✦</span>
            <span className="game-over-star star-right">✦</span>
          </div>
          <p className="screen-eyebrow">NICE TRY!</p>
          <h1 id="game-over-title" className="game-over-title">ゲームオーバー</h1>
          <p className="game-over-description">置ける場所がなくなりました。もう一度挑戦しよう！</p>

          <div className="final-score-card">
            <span>今回のスコア</span>
            <strong>{score.toLocaleString()}</strong>
            <small>POINTS</small>
          </div>

          <button type="button" className="primary-button replay-button" onClick={() => resetGame(true)}>
            <span>もう一度プレイ</span>
            <span className="button-arrow" aria-hidden="true">↻</span>
          </button>
          <button type="button" className="text-button" onClick={() => resetGame(false)}>
            ホームに戻る
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="game-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">クラシックパズル</p>
          <h1>Block Blast</h1>
        </div>

        <div className="score-panel">
          <span>スコア</span>
          <strong>{score}</strong>
        </div>
      </header>

      <div className="game-layout">
        <section className="board-panel">
          <div className="board" role="grid" aria-label="ゲームボード">
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isPreviewed = previewCells.some(
                  ({ row, col }) => row === rowIndex && col === colIndex,
                )
                const isInvalidPreview = redCells.some(
                  ({ row, col }) => row === rowIndex && col === colIndex,
                )

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    className={`cell ${cell ? 'filled' : ''} ${isPreviewed ? 'preview' : ''} ${isInvalidPreview ? 'invalid' : ''}`}
                    style={
                      cell
                        ? { background: cell }
                        : isPreviewed
                          ? {
                              background: isInvalidPreview ? '#ef4444' : hoveredPiecePreview.color,
                              boxShadow: 'inset 0 0 0 0.125rem rgba(255,255,255,0.8)',
                            }
                          : isInvalidPreview
                            ? { background: '#ef4444', opacity: 0.7 }
                            : undefined
                    }
                    data-row={rowIndex}
                    data-col={colIndex}
                    onClick={() => {
                      if (!placingEnabled) {
                        return
                      }

                      handleCellClick(rowIndex, colIndex)
                    }}
                    onMouseEnter={() => {
                      if (hoveredPiecePreview && placingEnabled) {
                        setHoverCell({ row: rowIndex, col: colIndex })
                      }
                    }}
                    onMouseLeave={() => setHoverCell(null)}
                    onDragOver={(event) => {
                      event.preventDefault()
                      if (placingEnabled) {
                        setHoverCell({ row: rowIndex, col: colIndex })
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (draggingPieceId && placingEnabled) {
                        const draggedPiece = pieces.find((piece) => piece.id === draggingPieceId)
                        if (draggedPiece) {
                          handleCellClick(rowIndex, colIndex, draggedPiece)
                        }
                      }
                    }}
                    aria-label={`${rowIndex + 1}行目、${colIndex + 1}列目`}
                  />
                )
              }),
            )}
          </div>
        </section>

        <aside className="sidebar">
          <h2 className="piece-list-heading">ブロックを選択</h2>
          <div className="piece-list">
            {pieces.map((piece, index) => {
              const isSelected = placingEnabled && selectedPiece?.id === piece.id

              return (
                <button
                  key={piece.id}
                  type="button"
                  className={`piece ${isSelected ? 'selected' : ''} ${draggingPieceId === piece.id ? 'dragging' : ''}`}
                  style={{ '--piece-color': piece.color }}
                  aria-label={`ブロック ${index + 1}${isSelected ? '、選択中' : '、長押しして盤面へ移動'}`}
                  aria-pressed={isSelected}
                  onPointerDown={(event) => {
                    if (!event.isPrimary || event.button !== 0) {
                      return
                    }

                    event.preventDefault()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setSelectedPieceId(piece.id)
                    setDraggingPieceId(piece.id)
                    setDragPosition({ x: event.clientX, y: event.clientY })
                    setPlacingEnabled(true)
                    setSelectionLocked(false)
                  }}
                  onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                      return
                    }

                    setDragPosition({ x: event.clientX, y: event.clientY })
                    const cell = document
                      .elementFromPoint(event.clientX, event.clientY)
                      ?.closest('.cell')

                    setHoverCell(
                      cell
                        ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
                        : null,
                    )
                  }}
                  onPointerUp={(event) => {
                    const cell = document
                      .elementFromPoint(event.clientX, event.clientY)
                      ?.closest('.cell')

                    suppressPieceClickRef.current = true
                    window.setTimeout(() => {
                      suppressPieceClickRef.current = false
                    }, 0)

                    if (cell) {
                      handleCellClick(Number(cell.dataset.row), Number(cell.dataset.col), piece)
                      setDraggingPieceId(null)
                      setDragPosition(null)
                      setHoverCell(null)
                    } else {
                      handlePieceSelection(piece.id)
                      setDraggingPieceId(null)
                      setDragPosition(null)
                      setHoverCell(null)
                    }

                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                    }
                  }}
                  onPointerCancel={(event) => {
                    setDraggingPieceId(null)
                    setDragPosition(null)
                    setHoverCell(null)

                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                    }
                  }}
                  onClick={() => {
                    if (suppressPieceClickRef.current) {
                      suppressPieceClickRef.current = false
                      return
                    }

                    handlePieceSelection(piece.id)
                  }}
                >
                  <span className="piece-grid" aria-hidden="true">
                    {Array.from({ length: 9 }, (_, cellIndex) => {
                      const row = Math.floor(cellIndex / 3)
                      const col = cellIndex % 3
                      const filled = piece.shape.some((block) => block.row === row && block.col === col)

                      return (
                        <span
                          key={`${piece.id}-${row}-${col}`}
                          className={`piece-cell ${filled ? 'filled' : ''}`}
                        />
                      )
                    })}
                  </span>
                  <span className="piece-status">{isSelected ? '選択中' : '長押しして移動'}</span>
                </button>
              )
            })}
          </div>

        </aside>
      </div>
      {draggedPiece && dragPosition && (
        <div
          className="drag-preview"
          style={{ left: dragPosition.x, top: dragPosition.y, '--piece-color': draggedPiece.color }}
          aria-hidden="true"
        >
          <span className="piece-grid">
            {Array.from({ length: 9 }, (_, cellIndex) => {
              const row = Math.floor(cellIndex / 3)
              const col = cellIndex % 3
              const filled = draggedPiece.shape.some((block) => block.row === row && block.col === col)

              return <span key={`${draggingPieceId}-${row}-${col}`} className={`piece-cell ${filled ? 'filled' : ''}`} />
            })}
          </span>
        </div>
      )}
    </main>
  )
}

export default App
