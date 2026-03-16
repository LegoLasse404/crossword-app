"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { useUser } from "@/hooks/use-user";
import { Auth } from "@/components/auth/auth-form";
import { authFetch } from "@/lib/auth-fetch";

interface HintWordPair {
  id: string;
  hint: string;
  word: string;
}

export default function Home() {
  const user = useUser();
  const [title, setTitle] = useState("");
  const [previewLayout, setPreviewLayout] = useState<any | null>(null);

  const [pairs, setPairs] = useState<HintWordPair[]>([
    { id: "1", hint: "", word: "" },
  ]);

  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get("edit");
    if (!editId || !user?.id) return;

    const loadForEdit = async () => {
      try {
        const res = await authFetch(`/api/crosswords/${editId}`);
        const data = await res.json();

        if (!res.ok) {
          alert(data?.error || "Failed to load crossword for edit");
          return;
        }

        const crossword = data?.crossword;
        setTitle(crossword?.title || "");

        const sourceClues = Array.isArray(crossword?.crossword_clues)
          ? crossword.crossword_clues
          : [];

        const loadedPairs = sourceClues.map((clue: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          hint: String(clue?.hint || ""),
          word: String(clue?.word || "").toUpperCase(),
        }));

        setPairs(
          loadedPairs.length > 0
            ? [...loadedPairs, createEmptyPair()]
            : [{ id: "1", hint: "", word: "" }]
        );
      } catch (err) {
        alert((err as Error).message || "Failed to load crossword for edit");
      }
    };

    loadForEdit();
  }, [user?.id]);

  const createEmptyPair = (): HintWordPair => ({
    id: Date.now().toString(),
    hint: "",
    word: "",
  });

  const isPairFilled = (pair: HintWordPair) =>
    pair.hint.trim().length > 0 && pair.word.trim().length > 0;

  const handleInputChange = (
    id: string,
    field: "hint" | "word",
    value: string
  ) => {
    setPairs((currentPairs) => {
      const updatedPairs = currentPairs.map((pair) =>
        pair.id === id ? { ...pair, [field]: value } : pair
      );

      const lastPair = updatedPairs[updatedPairs.length - 1];
      if (lastPair && isPairFilled(lastPair)) {
        return [...updatedPairs, createEmptyPair()];
      }

      return updatedPairs;
    });
  };

  const handleRemovePair = (id: string) => {
    setPairs((currentPairs) => {
      const filteredPairs = currentPairs.filter((pair) => pair.id !== id);

      if (filteredPairs.length === 0) {
        return [createEmptyPair()];
      }

      const lastPair = filteredPairs[filteredPairs.length - 1];
      if (lastPair && isPairFilled(lastPair)) {
        return [...filteredPairs, createEmptyPair()];
      }

      return filteredPairs;
    });
  };

  useEffect(() => {
    const words = pairs
      .map((pair) => ({
        answer: pair.word.trim().toUpperCase(),
        clue: pair.hint.trim(),
      }))
      .filter((word) => word.answer.length > 0 && word.clue.length > 0);

    if (words.length === 0) {
      setPreviewLayout(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const res = await authFetch("/api/crosswords/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words }),
        });

        const data = await res.json();
        if (res.ok) {
          setPreviewLayout(data.layout || null);
        } else {
          setPreviewLayout(null);
        }
      } catch {
        setPreviewLayout(null);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [pairs]);

  const handleCreate = async () => {
    // build words array from pairs
    const words = pairs
      .map((p) => ({
        answer: p.word.trim().toUpperCase(),
        clue: p.hint.trim(),
      }))
      .filter((word) => word.answer.length > 0 && word.clue.length > 0)
      .slice(0, 100);

    if (words.length === 0) {
      alert("Please add at least one complete hint/word pair");
      return;
    }

    try {
      const res = await authFetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words, title }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("API error", data);
        alert(data.error || "Failed to create crossword");
        return;
      }
      console.log("created crossword", data);
      alert("Crossword created!");
      // reset form
      setTitle("");
      setPairs([{ id: "1", hint: "", word: "" }]);
    } catch (err) {
      console.error(err);
      alert("Unknown error");
    }
  };

  const previewGrid = previewLayout?.table || [];
  const previewRows = previewLayout?.rows || 0;
  const previewCols = previewLayout?.cols || 0;
  const previewLetters = new Map<string, string>();
  const hasPreviewCellAt = (row: number, col: number) => {
    if (row < 0 || col < 0 || row >= previewRows || col >= previewCols) return false;
    return previewGrid[row]?.[col] !== "-";
  };
  const previewClueNumberByCell = new Map<string, number>();

  if (Array.isArray(previewLayout?.result)) {
    for (const word of previewLayout.result) {
      const answer = String(word?.answer || "").toUpperCase();
      const startX = Number(word?.startx) - 1;
      const startY = Number(word?.starty) - 1;
      const orientation = String(word?.orientation || "").toLowerCase();

      if (!answer || Number.isNaN(startX) || Number.isNaN(startY)) continue;

      for (let index = 0; index < answer.length; index++) {
        const row = orientation === "down" ? startY + index : startY;
        const col = orientation === "down" ? startX : startX + index;
        previewLetters.set(`${row}-${col}`, answer[index]);
      }
    }
  }

  let previewClueNumber = 1;
  for (let rowIndex = 0; rowIndex < previewRows; rowIndex++) {
    for (let colIndex = 0; colIndex < previewCols; colIndex++) {
      if (!hasPreviewCellAt(rowIndex, colIndex)) continue;

      const startsAcross =
        !hasPreviewCellAt(rowIndex, colIndex - 1) && hasPreviewCellAt(rowIndex, colIndex + 1);
      const startsDown =
        !hasPreviewCellAt(rowIndex - 1, colIndex) && hasPreviewCellAt(rowIndex + 1, colIndex);

      if (startsAcross || startsDown) {
        previewClueNumberByCell.set(`${rowIndex}-${colIndex}`, previewClueNumber);
        previewClueNumber += 1;
      }
    }
  }

  return (
    <div className="classic-page flex min-h-screen flex-col">
      <Header />

      <main className="classic-main flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {user ? (
          <>
            <h1 className="classic-title text-3xl font-bold mb-8">
              Create Crossword
            </h1>

            {/* Title input removed as requested */}

            <div className="mb-8">
              {previewLayout && (
                <div
                  className="inline-grid gap-0"
                  style={{
                    gridTemplateColumns: `repeat(${previewCols}, 32px)`,
                    gridTemplateRows: `repeat(${previewRows}, 32px)`,
                  }}
                >
                  {previewGrid.map((row: any[], rowIndex: number) =>
                    row.map((cell: any, colIndex: number) => {
                      const key = `${rowIndex}-${colIndex}`;
                      const isBlank = cell === "-";

                      if (isBlank) {
                        return <div key={key} className="w-8 h-8" />;
                      }

                      const hasTop = hasPreviewCellAt(rowIndex - 1, colIndex);
                      const hasRight = hasPreviewCellAt(rowIndex, colIndex + 1);
                      const hasBottom = hasPreviewCellAt(rowIndex + 1, colIndex);
                      const hasLeft = hasPreviewCellAt(rowIndex, colIndex - 1);
                      const letter =
                        previewLetters.get(key) ||
                        (typeof cell === "string" && cell !== "-" ? cell.toUpperCase() : "");

                      return (
                        <div
                          key={key}
                          className="classic-grid-cell w-8 h-8 relative flex items-center justify-center"
                          style={{
                            borderTopWidth: hasTop ? "0.5px" : "2px",
                            borderRightWidth: hasRight ? "0.5px" : "2px",
                            borderBottomWidth: hasBottom ? "0.5px" : "2px",
                            borderLeftWidth: hasLeft ? "0.5px" : "2px",
                          }}
                        >
                          {previewClueNumberByCell.has(key) && (
                            <span className="classic-text absolute top-0 left-0 text-[10px] font-semibold px-1 leading-none pt-0.5">
                              {previewClueNumberByCell.get(key)}
                            </span>
                          )}
                          <span className="classic-grid-input text-sm font-semibold">{letter}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {pairs.map((pair) => (
                <div key={pair.id} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center">
                    <textarea
                      value={pair.hint}
                      onChange={(e) =>
                        handleInputChange(pair.id, "hint", e.target.value)
                      }
                      className="classic-input w-full h-11 px-4 py-2 border rounded-lg placeholder-zinc-500 focus:outline-none resize-none overflow-hidden"
                      placeholder="Enter a hint..."
                      aria-label="Hint"
                      rows={1}
                    />

                    <textarea
                      value={pair.word}
                      onChange={(e) =>
                        handleInputChange(pair.id, "word", e.target.value)
                      }
                      className="classic-input w-full h-11 px-4 py-2 border rounded-lg placeholder-zinc-500 focus:outline-none resize-none overflow-hidden"
                      placeholder="Enter a word..."
                      aria-label="Word"
                      rows={1}
                    />

                    <button
                      onClick={() => handleRemovePair(pair.id)}
                      className="classic-btn-danger min-w-[96px] h-11 px-3 py-2 rounded font-medium"
                      disabled={pairs.length === 1}
                      title="Remove this row"
                    >
                      Remove
                    </button>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleCreate}
                className="classic-btn-sage px-8 py-3 font-medium rounded transition-colors"
              >
                Create
              </button>
            </div>
          </>
        ) : (
          <Auth />
        )}
      </main>
    </div>
  );
}
