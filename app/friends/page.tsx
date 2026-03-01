"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { useUser } from "@/hooks/use-user";
import { authFetch } from "@/lib/auth-fetch";

interface UserProfile {
  id: string;
  email: string;
  username?: string;
}

interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user?: UserProfile;
  status: "pending" | "accepted";
  created_at: string;
}

interface Friend {
  friendship_id: string;
  id: string; // friend's user ID
  email: string;
  username?: string;
}

export default function FriendsPage() {
  const user = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Fetch friend requests and friends list on mount
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [requestsRes, friendsRes] = await Promise.all([
          authFetch(`/api/friend-requests`),
          authFetch(`/api/friends`),
        ]);

        if (requestsRes.ok) {
          const data = await requestsRes.json();
          setFriendRequests(data.requests || []);
        }

        if (friendsRes.ok) {
          const data = await friendsRes.json();
          setFriends(data.friends || []);
        }
      } catch (err) {
        console.error("Failed to fetch friends data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await authFetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (toUserId: string) => {
    try {
      const res = await authFetch("/api/friend-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: toUserId }),
      });

      if (res.ok) {
        alert("Friend request sent!");
        setSearchResults(searchResults.filter((u) => u.id !== toUserId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send request");
      }
    } catch (err) {
      alert((err as Error).message || "Unknown error");
    }
  };

  const handleAcceptRequest = async (requestId: string, fromUserId: string) => {
    try {
      const res = await authFetch(`/api/friend-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });

      if (res.ok) {
        setFriendRequests(friendRequests.filter((r) => r.id !== requestId));
        // Refresh friends list
        const friendsRes = await authFetch(`/api/friends`);
        if (friendsRes.ok) {
          const data = await friendsRes.json();
          setFriends(data.friends || []);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to accept request");
      }
    } catch (err) {
      alert((err as Error).message || "Unknown error");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await authFetch(`/api/friend-requests/${requestId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setFriendRequests(friendRequests.filter((r) => r.id !== requestId));
      }
    } catch (err) {
      alert((err as Error).message || "Unknown error");
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm("Remove this friend?")) return;

    try {
      const res = await authFetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setFriends(friends.filter((f) => f.friendship_id !== friendshipId));
      }
    } catch (err) {
      alert((err as Error).message || "Unknown error");
    }
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
          Friends
        </h1>

        {/* Search Section */}
        <div className="mb-12">
          <h2 className="classic-title text-xl font-semibold mb-4">
            Search Users
          </h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by email or username..."
            className="classic-input w-full px-4 py-2 border rounded mb-4"
          />

          {searching && <p className="classic-text">Searching...</p>}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="classic-surface flex items-center justify-between p-4 border"
                >
                  <div>
                    <p className="classic-text font-medium">
                      {result.username || "No username"}
                    </p>
                    <p className="classic-text text-sm">
                      {result.email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendRequest(result.id)}
                    className="classic-btn-blue px-4 py-2 rounded font-medium transition-colors"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friend Requests Section */}
        {friendRequests.length > 0 && (
          <div className="mb-12">
            <h2 className="classic-title text-xl font-semibold mb-4">
              Friend Requests ({friendRequests.length})
            </h2>
            <div className="space-y-2">
              {friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="classic-surface flex items-center justify-between p-4 border"
                >
                  <div>
                    <p className="classic-text font-medium">
                      {request.from_user?.username || "Unknown User"}
                    </p>
                    <p className="classic-text text-sm">
                      {request.from_user?.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleAcceptRequest(request.id, request.from_user_id)
                      }
                      className="classic-btn-sage px-4 py-2 rounded font-medium transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="classic-btn-danger px-4 py-2 rounded font-medium transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List Section */}
        <div>
          <h2 className="classic-title text-xl font-semibold mb-4">
            My Friends ({friends.length})
          </h2>

          {friends.length === 0 ? (
            <p className="classic-text">
              No friends yet. Search for users above!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="classic-surface p-4 border hover:shadow-sm transition-shadow"
                >
                  <h3 className="classic-text text-lg font-semibold mb-1">
                    {friend.username || "Unknown"}
                  </h3>
                  <p className="classic-text text-sm mb-4">
                    {friend.email}
                  </p>
                  <button
                    onClick={() => handleRemoveFriend(friend.friendship_id)}
                    className="classic-btn-danger w-full px-4 py-2 rounded font-medium transition-colors"
                  >
                    Remove Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
