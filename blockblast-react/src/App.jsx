import { useEffect, useRef, useState } from 'react'
import './App.css'
import HomeScreen from './HomeScreen.jsx'

const BOARD_SIZE = 8

const BASE_SHAPES = [
  [{ row: 0, col: 0 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 0, col: 2 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }],
  [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }],
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }],
]

const normalizeShape = (shape) => {
  const minRow = Math.min(...shape.map(({ row }) => row))
  const minCol = Math.min(...shape.map(({ col }) => col))

  return shape
    .map(({ row, col }) => ({ row: row - minRow, col: col - minCol }))
    .sort((first, second) => first.row - second.row || first.col - second.col)
}

const SHAPES = [...new Map(BASE_SHAPES.flatMap((baseShape) => {
  const rotations = []
  let shape = normalizeShape(baseShape)

  for (let turn = 0; turn < 4; turn += 1) {
    rotations.push(shape)
    shape = normalizeShape(shape.map(({ row, col }) => ({ row: col, col: -row })))
  }

  return rotations.map((rotation) => [
    rotation.map(({ row, col }) => `${row},${col}`).join(';'),
    rotation,
  ])
})).values()]

const COLORS = ['#ffd166', '#06d6a0', '#4cc9f0', '#c77dff', '#f4a261']

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null))

const createRandomPiece = (shape) => {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]

  return {
    id: `${Date.now()}-${Math.random()}`,
    color,
    shape,
  }
}

const createInitialPieces = () => {
  const availableShapes = [...SHAPES]

  for (let index = availableShapes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const shape = availableShapes[index]
    availableShapes[index] = availableShapes[swapIndex]
    availableShapes[swapIndex] = shape
  }

  return availableShapes.slice(0, 3).map((shape) => createRandomPiece(shape))
}

function PieceGrid({ piece }) {
  const rows = Math.max(...piece.shape.map(({ row }) => row)) + 1
  const cols = Math.max(...piece.shape.map(({ col }) => col)) + 1
  const compact = Math.max(rows, cols) > 3

  return (
    <span
      className={`piece-grid ${compact ? 'piece-grid-compact' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, var(--piece-cell-size))`,
        gridTemplateRows: `repeat(${rows}, var(--piece-cell-size))`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: rows * cols }, (_, cellIndex) => {
        const row = Math.floor(cellIndex / cols)
        const col = cellIndex % cols
        const filled = piece.shape.some((block) => block.row === row && block.col === col)

        return (
          <span
            key={`${piece.id}-${row}-${col}`}
            className={`piece-cell ${filled ? 'filled' : ''}`}
          />
        )
      })}
    </span>
  )
}

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
  const [clearingCells, setClearingCells] = useState([])
  const [clearingLines, setClearingLines] = useState(false)
  const [score, setScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardStatus, setLeaderboardStatus] = useState('idle')
  const dragTargetCellRef = useRef(null)
  const dragPreviewRef = useRef(null)
  const gamePageRef = useRef(null)
  const lineClearTimerRef = useRef(null)
  const suppressPieceClickRef = useRef(false)
  const scoreSubmittedRef = useRef(false)
  const gameOver = hasStarted && !clearingLines && pieces.length > 0 && !pieces.some((piece) => canPieceFitAnywhere(piece, board))

  useEffect(() => {
    const gamePage = gamePageRef.current
    const boardElement = gamePage?.querySelector('.board')
    const firstCell = boardElement?.querySelector('.cell')

    if (!gamePage || !boardElement || !firstCell) {
      return
    }

    const updatePieceScale = () => {
      const cellSize = firstCell.getBoundingClientRect().width
      gamePage.style.setProperty('--board-cell-size', `${cellSize}px`)
    }

    updatePieceScale()

    const resizeObserver = new ResizeObserver(updatePieceScale)
    resizeObserver.observe(boardElement)

    return () => resizeObserver.disconnect()
  }, [hasStarted])

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

  useEffect(() => {
    if (!gameOver || scoreSubmittedRef.current) {
      return
    }

    scoreSubmittedRef.current = true
    let active = true

    const submitScore = async () => {
      setLeaderboardStatus('loading')

      try {
        const response = await fetch('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score }),
        })

        if (!response.ok) {
          throw new Error(`Leaderboard request failed with status ${response.status}`)
        }

        const result = await response.json()

        if (!Array.isArray(result.scores)) {
          throw new Error('Leaderboard response did not include a score list')
        }

        if (active) {
          setLeaderboard(result.scores)
          setLeaderboardStatus('ready')
        }
      } catch (error) {
        console.error('Unable to submit the final score:', error)
        if (active) {
          setLeaderboardStatus('error')
        }
      }
    }

    submitScore()
    return () => {
      active = false
    }
  }, [gameOver, score])

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
      return { board: nextBoard, cleared: 0, cells: [] }
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
    const cells = []
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (filledRows.includes(row) || filledCols.includes(col)) {
          cells.push({ row, col })
        }
      }
    }

    return { board: clearedBoard, cleared, cells }
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
    if (gameOver || clearingLines) {
      return
    }

    setSelectedPieceId(pieceId)
    setSelectionLocked(false)
    setPlacingEnabled(true)
    setHoverCell(null)
  }

  const setDragTargetCell = (cell) => {
    const previousCell = dragTargetCellRef.current
    if (previousCell?.row === cell?.row && previousCell?.col === cell?.col) {
      return
    }

    dragTargetCellRef.current = cell
    setHoverCell(cell)
  }

  const getDragTargetCell = (event) => {
    const previewAnchor = dragPreviewRef.current?.querySelector('.piece-cell')
    const previewAnchorBounds = previewAnchor?.getBoundingClientRect()
    const targetX = previewAnchorBounds
      ? previewAnchorBounds.left + previewAnchorBounds.width / 2
      : event.clientX
    const targetY = previewAnchorBounds
      ? previewAnchorBounds.top + previewAnchorBounds.height / 2
      : event.clientY

    return document.elementFromPoint(targetX, targetY)?.closest('.board .cell') ?? null
  }

  const handleCellClick = (row, col, pieceOverride = selectedPiece) => {
    if (gameOver || clearingLines) {
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

    const { board: cleanedBoard, cleared, cells } = resolveCompletedLines(nextBoard)
    const remainingPieces = pieces.filter((piece) => piece.id !== pieceToPlace.id)
    const bonusByClears = cleared === 0 ? 0 : cleared === 1 ? 25 : cleared === 2 ? 60 : 120
    const placementScore = pieceToPlace.shape.length + bonusByClears

    if (cleared > 0) {
      setBoard(nextBoard)
      setClearingCells(cells)
      setClearingLines(true)
      lineClearTimerRef.current = window.setTimeout(() => {
        setBoard(cleanedBoard)
        setClearingCells([])
        setClearingLines(false)
        lineClearTimerRef.current = null
      }, 360)
    } else {
      setBoard(cleanedBoard)
    }
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
    if (lineClearTimerRef.current !== null) {
      window.clearTimeout(lineClearTimerRef.current)
      lineClearTimerRef.current = null
    }

    setBoard(createEmptyBoard())
    setPieces(createInitialPieces())
    setSelectedPieceId(null)
    setDraggingPieceId(null)
    setDragPosition(null)
    setPlacingEnabled(false)
    setSelectionLocked(false)
    setClearingCells([])
    setClearingLines(false)
    setScore(0)
    setLeaderboard([])
    setLeaderboardStatus('idle')
    scoreSubmittedRef.current = false
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

          <div className="final-score-card" aria-label={`今回のスコア ${score}点`}>
            <span>今回のスコア</span>
            <strong>{score.toLocaleString()}</strong>
            <small>POINTS</small>
          </div>

          <section className="leaderboard-panel" aria-labelledby="leaderboard-title">
            <div className="leaderboard-heading">
              <div>
                <span>ALL PLAYERS</span>
                <h2 id="leaderboard-title">ランキング</h2>
              </div>
              <strong>TOP 10</strong>
            </div>

            {leaderboardStatus === 'loading' && (
              <p className="leaderboard-message" role="status">ランキングを読み込み中...</p>
            )}
            {leaderboardStatus === 'error' && (
              <p className="leaderboard-message leaderboard-error" role="status">
                ランキングに接続できませんでした。公開サーバーとデータベースの設定を確認してください。
              </p>
            )}
            {leaderboardStatus === 'ready' && leaderboard.length === 0 && (
              <p className="leaderboard-message">まだ記録がありません。最初のランクインを目指そう！</p>
            )}
            {leaderboardStatus === 'ready' && leaderboard.length > 0 && (
              <ol className="leaderboard-list">
                {leaderboard.map((entry) => (
                  <li className={`leaderboard-row ${entry.position <= 3 ? 'top-rank' : ''}`} key={entry.position}>
                    <span className="leaderboard-rank" aria-label={`${entry.position}位`}>
                      {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : entry.position}
                    </span>
                    <span className="leaderboard-name">{entry.name}</span>
                    <strong>{entry.score.toLocaleString()}</strong>
                  </li>
                ))}
              </ol>
            )}
          </section>

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
    <main className="game-page" ref={gamePageRef}>
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
                const isClearing = clearingCells.some(
                  ({ row, col }) => row === rowIndex && col === colIndex,
                )

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    className={`cell ${cell ? 'filled' : ''} ${isPreviewed ? 'preview' : ''} ${isInvalidPreview ? 'invalid' : ''} ${isClearing ? 'line-clearing' : ''}`}
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
                      if (!draggingPieceId && hoveredPiecePreview && placingEnabled) {
                        setHoverCell({ row: rowIndex, col: colIndex })
                      }
                    }}
                    onMouseLeave={() => {
                      if (!draggingPieceId) {
                        setHoverCell(null)
                      }
                    }}
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
                    if (clearingLines || !event.isPrimary || event.button !== 0) {
                      return
                    }

                    event.preventDefault()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setDragTargetCell(null)
                    setSelectedPieceId(piece.id)
                    setDraggingPieceId(piece.id)
                    setDragPosition({ x: event.clientX, y: event.clientY })
                    setHoverCell(null)
                    setPlacingEnabled(true)
                    setSelectionLocked(false)
                  }}
                  onPointerMove={(event) => {
                    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                      return
                    }

                    if (dragPreviewRef.current) {
                      dragPreviewRef.current.style.setProperty('--drag-x', `${event.clientX}px`)
                      dragPreviewRef.current.style.setProperty('--drag-y', `${event.clientY}px`)
                    }

                    const cell = getDragTargetCell(event)
                    const targetCell = cell
                      ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
                      : null

                    setDragTargetCell(targetCell)
                  }}
                  onPointerUp={(event) => {
                    if (dragPreviewRef.current) {
                      dragPreviewRef.current.style.setProperty('--drag-x', `${event.clientX}px`)
                      dragPreviewRef.current.style.setProperty('--drag-y', `${event.clientY}px`)
                    }

                    const cell = getDragTargetCell(event)
                    const targetCell = cell
                      ? { row: Number(cell.dataset.row), col: Number(cell.dataset.col) }
                      : null
                    setDragTargetCell(targetCell)

                    suppressPieceClickRef.current = true
                    window.setTimeout(() => {
                      suppressPieceClickRef.current = false
                    }, 0)

                    if (targetCell) {
                      handleCellClick(targetCell.row, targetCell.col, piece)
                      setDraggingPieceId(null)
                      setDragPosition(null)
                      setHoverCell(null)
                    } else {
                      handlePieceSelection(piece.id)
                      setDraggingPieceId(null)
                      setDragPosition(null)
                      setHoverCell(null)
                    }
                    setDragTargetCell(null)

                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                    }
                  }}
                  onPointerCancel={(event) => {
                    setDragTargetCell(null)
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
                  <PieceGrid piece={piece} />
                  <span className="piece-status">{isSelected ? '選択中' : '長押しして移動'}</span>
                </button>
              )
            })}
          </div>

        </aside>
      </div>
      {draggedPiece && dragPosition && (
        <div
          ref={dragPreviewRef}
          className="drag-preview"
          style={{
            '--drag-x': `${dragPosition.x}px`,
            '--drag-y': `${dragPosition.y}px`,
            '--piece-color': draggedPiece.color,
          }}
          aria-hidden="true"
        >
          <PieceGrid piece={draggedPiece} />
        </div>
      )}
    </main>
  )
}

export default App
