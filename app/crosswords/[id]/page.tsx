"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { useUser } from "@/hooks/use-user";
import { authFetch } from "@/lib/auth-fetch";

interface CrosswordClue {
  id: string;
  crossword_id: string;
  hint: string;
  word: string;
  created_at: string;
}

interface Crossword {
  id: string;
  user_id: string;
  title?: string;
  layout?: any;
  created_at: string;
  crossword_clues?: CrosswordClue[];
}

export default function PlayCrosswordPage() {
  const params = useParams();
  const user = useUser();
  const [crossword, setCrossword] = useState<Crossword | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [cellCheckStatus, setCellCheckStatus] = useState<Record<string, "correct" | "incorrect">>({});
  const [typingDirection, setTypingDirection] = useState<"right" | "down">("right");
  const [moveMode, setMoveMode] = useState<"directional" | "neutral">("directional");
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const fetchCrossword = async () => {
      try {
        const res = await authFetch(`/api/crosswords/${params.id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to fetch crossword");
          return;
        }

        setCrossword(data.crossword);
      } catch (err) {
        setError((err as Error).message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCrossword();
    }
  }, [params.id]);

  const handleCellChange = (row: number, col: number, value: string) => {
    const key = `${row}-${col}`;
    const normalizedValue = value.toUpperCase().slice(0, 1);
    setCellCheckStatus((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
    setUserAnswers((prev) => ({
      ...prev,
      [key]: normalizedValue,
    }));
    return normalizedValue;
  };

  if (loading) {
    return (
      <div className="classic-page flex min-h-screen flex-col">
        <Header />
        <main className="classic-main flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <p className="classic-text">Loading...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="classic-page flex min-h-screen flex-col">
        <Header />
        <main className="classic-main flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <p className="classic-text">
            Please log in or sign up. Go to the <Link href="/" className="classic-link underline">starting page</Link>.
          </p>
        </main>
      </div>
    );
  }

  if (error || !crossword) {
    return (
      <div className="classic-page flex min-h-screen flex-col">
        <Header />
        <main className="classic-main flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-red-600">{error || "Crossword not found"}</p>
        </main>
      </div>
    );
  }

  const layout = crossword.layout;
  const grid = layout?.table || [];
  const rows = layout?.rows || 0;
  const cols = layout?.cols || 0;
  const crosswordClues = crossword.crossword_clues || [];
  const acrossClues = crosswordClues.filter((clue) => {
    const wordData = layout?.result?.find(
      (w: any) => w.answer?.toLowerCase() === clue.word?.toLowerCase()
    );
    return wordData?.orientation === "across";
  });
  const downClues = crosswordClues.filter((clue) => {
    const wordData = layout?.result?.find(
      (w: any) => w.answer?.toLowerCase() === clue.word?.toLowerCase()
    );
    return wordData?.orientation === "down";
  });
  const handleCheck = () => {
    const correctByCell = new Map<string, string>();
    const words = Array.isArray(layout?.result) ? layout.result : [];

    for (const word of words) {
      const answer = String(word?.answer || "").toUpperCase();
      const startX = Number(word?.startx) - 1;
      const startY = Number(word?.starty) - 1;
      const orientation = String(word?.orientation || "").toLowerCase();

      if (!answer || Number.isNaN(startX) || Number.isNaN(startY)) continue;

      for (let index = 0; index < answer.length; index++) {
        const row = orientation === "down" ? startY + index : startY;
        const col = orientation === "down" ? startX : startX + index;
        const key = `${row}-${col}`;
        if (!correctByCell.has(key)) {
          correctByCell.set(key, answer[index]);
        }
      }
    }

    const nextStatus: Record<string, "correct" | "incorrect"> = {};

    for (const [key, correctLetter] of correctByCell.entries()) {
      const userLetter = (userAnswers[key] || "").trim().toUpperCase();

      if (!userLetter) {
        continue;
      }

      nextStatus[key] = userLetter === correctLetter ? "correct" : "incorrect";
    }

    setCellCheckStatus(nextStatus);
  };
  const hasCellAt = (row: number, col: number) => {
    if (row < 0 || col < 0 || row >= rows || col >= cols) return false;
    return grid[row]?.[col] !== "-";
  };
  const focusCell = (row: number, col: number) => {
    const input = cellRefs.current[`${row}-${col}`];
    if (!input) return;
    input.focus();
    input.select();
  };

  const findNextCellInDirection = (
    row: number,
    col: number,
    rowStep: number,
    colStep: number
  ) => {
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (nextRow >= 0 && nextCol >= 0 && nextRow < rows && nextCol < cols) {
      if (hasCellAt(nextRow, nextCol)) {
        return { row: nextRow, col: nextCol };
      }
      nextRow += rowStep;
      nextCol += colStep;
    }

    return null;
  };

  const findNextCellForTyping = (
    row: number,
    col: number,
    direction: "right" | "down"
  ) => {
    if (direction === "down") {
      const downCell = { row: row + 1, col };
      return hasCellAt(downCell.row, downCell.col) ? downCell : null;
    }

    const rightCell = { row, col: col + 1 };
    return hasCellAt(rightCell.row, rightCell.col) ? rightCell : null;
  };

  const findNextCellForNeutralMode = (row: number, col: number) => {
    const rightCell = { row, col: col + 1 };
    const downCell = { row: row + 1, col };

    const candidates: Array<{ row: number; col: number; direction: "right" | "down" }> = [];
    if (hasCellAt(rightCell.row, rightCell.col)) {
      candidates.push({ ...rightCell, direction: "right" });
    }
    if (hasCellAt(downCell.row, downCell.col)) {
      candidates.push({ ...downCell, direction: "down" });
    }

    if (candidates.length === 0) {
      return null;
    }

    const emptyCandidate = candidates.find(
      (candidate) => !(userAnswers[`${candidate.row}-${candidate.col}`] || "").trim()
    );

    return emptyCandidate || candidates[0];
  };

  const findPreviousCellForTyping = (
    row: number,
    col: number,
    direction: "right" | "down"
  ) => {
    if (direction === "down") {
      const upCell = { row: row - 1, col };
      return hasCellAt(upCell.row, upCell.col) ? upCell : null;
    }

    const leftCell = { row, col: col - 1 };
    return hasCellAt(leftCell.row, leftCell.col) ? leftCell : null;
  };

  const findPreviousCellForNeutralMode = (row: number, col: number) => {
    const leftCell = { row, col: col - 1 };
    const upCell = { row: row - 1, col };

    const candidates: Array<{ row: number; col: number; direction: "right" | "down" }> = [];
    if (hasCellAt(leftCell.row, leftCell.col)) {
      candidates.push({ ...leftCell, direction: "right" });
    }
    if (hasCellAt(upCell.row, upCell.col)) {
      candidates.push({ ...upCell, direction: "down" });
    }

    if (candidates.length === 0) {
      return null;
    }

    const emptyCandidate = candidates.find(
      (candidate) => !(userAnswers[`${candidate.row}-${candidate.col}`] || "").trim()
    );

    return emptyCandidate || candidates[0];
  };

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    row: number,
    col: number
  ) => {
    const key = `${row}-${col}`;
    const isCurrentCellEmpty = !(userAnswers[key] || "").trim();

    if ((event.key === "Backspace" || event.key === "Delete") && isCurrentCellEmpty) {
      const previousCell =
        moveMode === "neutral"
          ? findPreviousCellForNeutralMode(row, col)
          : findPreviousCellForTyping(row, col, typingDirection);

      if (previousCell) {
        event.preventDefault();
        if (moveMode === "neutral") {
          const inferredDirection = previousCell.row === row ? "right" : "down";
          setTypingDirection(inferredDirection);
          setMoveMode("directional");
        }
        focusCell(previousCell.row, previousCell.col);
      }
      return;
    }

    let target: { row: number; col: number } | null = null;

    if (event.key === "ArrowUp") {
      setMoveMode("neutral");
      target = findNextCellInDirection(row, col, -1, 0);
    } else if (event.key === "ArrowDown") {
      setMoveMode("neutral");
      target = findNextCellInDirection(row, col, 1, 0);
    } else if (event.key === "ArrowLeft") {
      setMoveMode("neutral");
      target = findNextCellInDirection(row, col, 0, -1);
    } else if (event.key === "ArrowRight") {
      setMoveMode("neutral");
      target = findNextCellInDirection(row, col, 0, 1);
    }

    if (target) {
      event.preventDefault();
      focusCell(target.row, target.col);
    }
  };
  const clueNumberByCell = new Map<string, number>();
  let clueNumber = 1;
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    for (let colIndex = 0; colIndex < cols; colIndex++) {
      if (!hasCellAt(rowIndex, colIndex)) continue;

      const startsAcross = !hasCellAt(rowIndex, colIndex - 1) && hasCellAt(rowIndex, colIndex + 1);
      const startsDown = !hasCellAt(rowIndex - 1, colIndex) && hasCellAt(rowIndex + 1, colIndex);

      if (startsAcross || startsDown) {
        clueNumberByCell.set(`${rowIndex}-${colIndex}`, clueNumber);
        clueNumber += 1;
      }
    }
  }
  const getClueNumberForWord = (wordData: any, fallbackNumber: number) => {
    if (
      wordData?.startx === undefined ||
      wordData?.starty === undefined
    ) {
      return fallbackNumber;
    }

    const rowIndex = Number(wordData.starty) - 1;
    const colIndex = Number(wordData.startx) - 1;
    const key = `${rowIndex}-${colIndex}`;
    return clueNumberByCell.get(key) ?? fallbackNumber;
  };

  return (
    <div className="classic-page flex min-h-screen flex-col">
      <Header />

      <main className="classic-main flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="classic-title text-3xl font-bold mb-8">
          {crossword.title || "Untitled Crossword"}
        </h1>

        {/* Crossword Grid */}
        <div className="mb-12">
          <div
            className="inline-grid gap-0"
            style={{
              gridTemplateColumns: `repeat(${cols}, 40px)`,
              gridTemplateRows: `repeat(${rows}, 40px)`,
            }}
          >
            {grid.map((row: any[], rowIndex: number) =>
              row.map((cell: any, colIndex: number) => {
                const key = `${rowIndex}-${colIndex}`;
                const isBlackCell = cell === "-";

                if (isBlackCell) {
                  return <div key={key} className="w-10 h-10" />;
                }

                const hasTop = hasCellAt(rowIndex - 1, colIndex);
                const hasRight = hasCellAt(rowIndex, colIndex + 1);
                const hasBottom = hasCellAt(rowIndex + 1, colIndex);
                const hasLeft = hasCellAt(rowIndex, colIndex - 1);
                const checkStatus = cellCheckStatus[key];

                return (
                  <div
                    key={key}
                    className="classic-grid-cell w-10 h-10 relative"
                    style={{
                      borderTopWidth: hasTop ? "0.5px" : "2px",
                      borderRightWidth: hasRight ? "0.5px" : "2px",
                      borderBottomWidth: hasBottom ? "0.5px" : "2px",
                      borderLeftWidth: hasLeft ? "0.5px" : "2px",
                      backgroundColor:
                        checkStatus === "correct"
                          ? "#bbf7d0"
                          : checkStatus === "incorrect"
                            ? "#fecaca"
                            : undefined,
                    }}
                  >
                    {clueNumberByCell.has(key) && (
                      <span className="classic-text absolute top-0 left-0 text-[10px] font-semibold px-1 leading-none pt-0.5">
                        {clueNumberByCell.get(key)}
                      </span>
                    )}
                    <input
                      type="text"
                      maxLength={1}
                      value={userAnswers[key] || ""}
                      onChange={(e) => {
                        const enteredValue = handleCellChange(
                          rowIndex,
                          colIndex,
                          e.target.value
                        );
                        if (enteredValue) {
                          const nextCell =
                            moveMode === "neutral"
                              ? findNextCellForNeutralMode(rowIndex, colIndex)
                              : findNextCellForTyping(rowIndex, colIndex, typingDirection);
                          if (nextCell) {
                            if (moveMode === "neutral") {
                              const inferredDirection =
                                nextCell.row === rowIndex ? "right" : "down";
                              setTypingDirection(inferredDirection);
                              setMoveMode("directional");
                            }
                            focusCell(nextCell.row, nextCell.col);
                          }
                        }
                      }}
                      onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                      onMouseDown={() => setMoveMode("neutral")}
                      ref={(input) => {
                        cellRefs.current[key] = input;
                      }}
                      className="classic-grid-input w-full h-full text-center text-lg font-bold bg-transparent border-0 outline-none uppercase"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Clues Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="classic-title text-2xl font-bold mb-4">
              Across
            </h2>
            <ol className="list-none">
              {acrossClues.map((clue, idx) => {
                  const wordData = layout?.result?.find(
                    (w: any) => w.answer?.toLowerCase() === clue.word?.toLowerCase()
                  );
                  return (
                    <li
                      key={clue.id}
                      className="classic-clue-item px-3 py-3 border-b last:border-b-0"
                    >
                      <span className="classic-text font-semibold">
                        {getClueNumberForWord(wordData, idx + 1)}.
                      </span>{" "}
                      <span className="classic-text">
                        {clue.hint}
                      </span>
                    </li>
                  );
                })}
            </ol>
          </div>

          <div>
            <h2 className="classic-title text-2xl font-bold mb-4">
              Down
            </h2>
            <ol className="list-none">
              {downClues.map((clue, idx) => {
                  const wordData = layout?.result?.find(
                    (w: any) => w.answer?.toLowerCase() === clue.word?.toLowerCase()
                  );
                  return (
                    <li
                      key={clue.id}
                      className="classic-clue-item px-3 py-3 border-b last:border-b-0"
                    >
                      <span className="classic-text font-semibold">
                        {getClueNumberForWord(wordData, idx + 1)}.
                      </span>{" "}
                      <span className="classic-text">
                        {clue.hint}
                      </span>
                    </li>
                  );
                })}
            </ol>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleCheck}
            className="classic-btn-blue px-5 py-2 rounded font-medium"
          >
            Check
          </button>
        </div>
      </main>
    </div>
  );
}
