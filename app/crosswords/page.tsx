"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { useUser } from "@/hooks/use-user";
import { Crossword } from "@/types/crossword";
import { authFetch } from "@/lib/auth-fetch";

export default function CrosswordsPage() {
  const user = useUser();
  const [crosswords, setCrosswords] = useState<Crossword[]>([]);
  const [sharedCrosswords, setSharedCrosswords] = useState<Crossword[]>([]);
  const [friendsList, setFriendsList] = useState<{friendship_id:string;id:string;email:string;username?:string}[]>([]);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (crosswordId: string) => {
    if (!confirm("Are you sure you want to delete this crossword?")) return;

    try {
      const res = await authFetch(`/api/crosswords/${crosswordId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete");
        return;
      }
      setCrosswords(crosswords.filter((c) => c.id !== crosswordId));
    } catch (err) {
      alert((err as Error).message || "Unknown error");
    }
  };

  const shareCrossword = (crosswordId: string) => {
    setSharingId(crosswordId);
    setSelectedFriendId("");
  };

  const confirmShare = async () => {
    if (!sharingId || !selectedFriendId) return;
    try {
      const res = await authFetch('/api/crosswords/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crossword_id: sharingId, shared_with_user_id: selectedFriendId }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Unable to share');
        return;
      }
      alert('Shared successfully');
    } catch (err) {
      alert((err as Error).message || 'Unknown error');
    } finally {
      setSharingId(null);
      setSelectedFriendId("");
    }
  };

  const cancelShare = () => {
    setSharingId(null);
    setSelectedFriendId("");
  };

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchCrosswords = async () => {
      try {
        const [mineRes, sharedRes, friendsRes] = await Promise.all([
          authFetch(`/api/crosswords`),
          authFetch(`/api/crosswords/shares`),
          authFetch(`/api/friends`),
        ]);

        const mineData = await mineRes.json();
        if (!mineRes.ok) {
          setError(mineData.error || "Failed to fetch crosswords");
          return;
        }
        setCrosswords(mineData.crosswords || []);

        if (sharedRes.ok) {
          const sharedData = await sharedRes.json();
          setSharedCrosswords(sharedData.crosswords || []);
        }

        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          setFriendsList(friendsData.friends || []);
        }
      } catch (err) {
        setError((err as Error).message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchCrosswords();
  }, [user?.id]);

  return (
    <div className="classic-page flex min-h-screen flex-col">
      <Header />

      <main className="classic-main flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {!user ? (
          <p className="classic-text">
            Please log in or sign up. Go to the <Link href="/" className="classic-link underline">starting page</Link>.
          </p>
        ) : (
          <>
        <h1 className="classic-title text-3xl font-bold mb-8">
          Crosswords
        </h1>

        {loading && (
          <p className="classic-text">Loading...</p>
        )}

        {error && (
          <p className="text-red-600">{error}</p>
        )}

        {!loading && crosswords.length === 0 && (
          <p className="classic-text">
            No crosswords yet. Create one on the home page!
          </p>
        )}

        {crosswords.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {crosswords.map((crossword) => (
              <div
                key={crossword.id}
                className="classic-surface p-6 border hover:shadow-sm transition-shadow cursor-pointer"
              >
                <h3 className="classic-text text-lg font-semibold mb-2">
                  {crossword.title || "Untitled"}
                </h3>
                <p className="classic-text text-sm mb-4">
                  Created: {new Date(crossword.created_at).toLocaleDateString()}
                </p>
              <div className="flex gap-2">
                <Link
                  href={`/crosswords/${crossword.id}`}
                  className="classic-btn-blue flex-1 px-4 py-2 rounded font-medium transition-colors text-center"
                >
                  Play
                </Link>
                <Link
                  href={`/?edit=${crossword.id}`}
                  className="classic-btn-neutral px-4 py-2 rounded font-medium transition-colors text-center"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(crossword.id)}
                  className="classic-btn-danger px-4 py-2 rounded font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={() => shareCrossword(crossword.id)}
                  className="classic-btn-sage px-4 py-2 rounded font-medium transition-colors"
                >
                  Share
                </button>
              </div>
              </div>
            ))}
          </div>
        )}

        {sharingId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="classic-main classic-page classic-border p-6 border w-full max-w-md">
              <h2 className="classic-title text-xl font-bold mb-4">
                Share Crossword
              </h2>
              <select
                value={selectedFriendId}
                onChange={(e) => setSelectedFriendId(e.target.value)}
                className="classic-input w-full mb-4 p-2 border rounded"
              >
                <option value="">-- choose friend --</option>
                {friendsList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.username || f.email}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelShare}
                  className="classic-btn-neutral px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmShare}
                  disabled={!selectedFriendId}
                  className="classic-btn-sage px-4 py-2 rounded"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Shared with me section */}
        {sharedCrosswords.length > 0 && (
          <>
            <h2 className="classic-title text-2xl font-bold mb-4 mt-12">
              Shared With Me
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedCrosswords.map((cw) => (
                <div
                  key={cw.id}
                  className="classic-surface p-6 border hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <h3 className="classic-text text-lg font-semibold mb-2">
                    {cw.title || "Untitled"}
                  </h3>
                  <p className="classic-text text-sm mb-4">
                    Created: {new Date(cw.created_at).toLocaleDateString()}
                  </p>
                  <Link
                    href={`/crosswords/${cw.id}`}
                    className="classic-btn-blue block px-4 py-2 rounded font-medium transition-colors text-center"
                  >
                    Play
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
          </>
        )}
      </main>
    </div>
  );
}

