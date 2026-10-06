import { useEffect, useState } from 'react'
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

function App() {
  const [hasStarted, setHasStarted] = useState(false)
  const [board, setBoard] = useState(createEmptyBoard)
  const [pieces, setPieces] = useState(createInitialPieces)
  const [selectedPieceId, setSelectedPieceId] = useState(null)
  const [draggingPieceId, setDraggingPieceId] = useState(null)
  const [hoverCell, setHoverCell] = useState(null)
  const [placingEnabled, setPlacingEnabled] = useState(false)
  const [selectionLocked, setSelectionLocked] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState('ブロックを選んで、置く場所を選択してください。')

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
  const hoveredPiecePreview = pieces.find((piece) => piece.id === draggingPieceId) ?? selectedPiece

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
    }e

    return false
  }

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

  useEffect(() => {
    if (!hasStarted || gameOver || pieces.length === 0) {
      return
    }

    const canMove = pieces.some((piece) => canPieceFitAnywhere(piece, board))

    if (!canMove) {
      setGameOver(true)
      setSelectedPieceId(null)
      setStatus('ゲームオーバーです。置ける場所がありません。')
    }
  }, [board, pieces, gameOver, hasStarted])

  const handlePieceSelection = (pieceId) => {
    if (gameOver) {
      return
    }

    setSelectedPieceId(pieceId)
    setSelectionLocked(false)
    setPlacingEnabled(true)
    setHoverCell(null)
    setStatus('ブロックを選択しました。置ける場所をタップしてください。')
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
      setStatus('ここには置けません。別の場所を選んでください。')
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
      setStatus(cleared > 0 ? `ナイスです！${cleared}列を消して ${placementScore} 点獲得！` : 'ナイスです！次のブロックを準備しました。')
      return
    }

    setPieces(remainingPieces)
    setSelectedPieceId(null)
    setSelectionLocked(true)
    setStatus(cleared > 0 ? `置けました！${cleared}列を消して ${placementScore} 点獲得。次のブロックを選んでください。` : '置けました！次のブロックを選んでください。')
    setPlacingEnabled(false)
    setHoverCell(null)
  }

  const resetGame = (start = true) => {
    setBoard(createEmptyBoard())
    setPieces(createInitialPieces())
    setSelectedPieceId(null)
    setGameOver(false)
    setPlacingEnabled(false)
    setSelectionLocked(false)
    setScore(0)
    setStatus('ブロックを選んで、置く場所を選択してください。')
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
          <button type="button" className="home-link" onClick={() => resetGame(false)}>
            <span aria-hidden="true">←</span> ホーム
          </button>
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
                              boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.8)',
                            }
                          : isInvalidPreview
                            ? { background: '#ef4444', opacity: 0.7 }
                            : undefined
                    }
                    onPointerDown={(event) => {
                      event.preventDefault()

                      if (!placingEnabled) {
                        return
                      }

                      handleCellClick(rowIndex, colIndex)
                    }}
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
          <div className="status-card">
            <h2>状態</h2>
            <p>{status}</p>
          </div>

          <div className="piece-list">
            {pieces.map((piece) => (
              <button
                key={piece.id}
                type="button"
                draggable
                className={`piece ${selectedPiece?.id === piece.id ? 'selected' : ''} ${draggingPieceId === piece.id ? 'dragging' : ''}`}
                style={{ '--piece-color': piece.color }}
                onPointerDown={(event) => {
                  event.preventDefault()
                  handlePieceSelection(piece.id)
                }}
                onClick={() => {
                  handlePieceSelection(piece.id)
                }}
                onDragStart={(event) => {
                  setSelectedPieceId(piece.id)
                  setDraggingPieceId(piece.id)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', piece.id)
                }}
                onDragEnd={() => setDraggingPieceId(null)}
              >
                <span className="piece-grid" aria-label="piece preview">
                  {Array.from({ length: 9 }, (_, index) => {
                    const row = Math.floor(index / 3)
                    const col = index % 3
                    const filled = piece.shape.some((block) => block.row === row && block.col === col)

                    return (
                      <span
                        key={`${piece.id}-${row}-${col}`}
                        className={`piece-cell ${filled ? 'filled' : ''}`}
                      />
                    )
                  })}
                </span>
              </button>
            ))}
          </div>

        </aside>
      </div>
    </main>
  )
}

export default App
