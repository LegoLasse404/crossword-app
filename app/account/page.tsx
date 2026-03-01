"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/auth-fetch";

export default function AccountPage() {
  const user = useUser();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");

    // load profile (username) from user_profiles
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (error) {
        // no profile is fine
        return;
      }

      setUsername(data?.username ?? "");
    };

    fetchProfile();
  }, [user]);

  const handleSaveUsername = async () => {
    if (!user) return setMessage("Not signed in");
    setLoading(true);
    setMessage(null);

    try {
      const res = await authFetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Failed to save username");
      } else {
        setMessage("Username saved");
      }
    } catch (err: any) {
      setMessage(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!user) return setMessage("Not signed in");
    if (!newEmail) return setMessage("Enter a new email");
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) setMessage(error.message);
    else setMessage("Check your email to confirm the change");

    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!user) return setMessage("Not signed in");
    if (!password) return setMessage("Enter a new password");
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) setMessage(error.message);
    else setMessage("Password updated");

    setLoading(false);
    setPassword("");
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setMessage("Signed out");
      // reload to update UI
      window.location.reload();
    } catch (err: any) {
      setMessage(err?.message || "Sign out failed");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return setMessage("Not signed in");
    const ok = confirm("Delete your account and all data? This cannot be undone.");
    if (!ok) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await authFetch("/api/account/delete", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || "Failed to delete account");
      } else {
        setMessage("Account deleted");
        // ensure client session cleared
        await supabase.auth.signOut();
        window.location.reload();
      }
    } catch (err: any) {
      setMessage(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="classic-page flex min-h-screen flex-col">
      <Header />

      <main className="classic-main flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="classic-title text-3xl font-bold mb-4">
          Account
        </h1>

        {!user ? (
          <p className="classic-text">
            Please log in or sign up. Go to the <Link href="/" className="classic-link underline">starting page</Link>.
          </p>
        ) : (
          <div className="space-y-8">
            <div className="flex gap-3 justify-end">
              <button
                className="classic-btn-neutral px-3 py-2 rounded"
                onClick={handleLogout}
                disabled={loading}
              >
                Logout
              </button>
              <button
                className="classic-btn-danger px-3 py-2 rounded"
                onClick={handleDeleteAccount}
                disabled={loading}
              >
                Delete account
              </button>
            </div>
            <section className="classic-surface p-6 border">
              <h2 className="classic-title text-xl font-semibold mb-2">Profile</h2>
              <label className="classic-text block text-sm">Username</label>
              <div className="flex gap-2 mt-2">
                <input
                  className="classic-input w-full px-3 py-2 rounded border"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                />
                <button
                  className="classic-btn-blue px-4 py-2 rounded"
                  onClick={handleSaveUsername}
                  disabled={loading}
                >
                  Save
                </button>
              </div>
              {!username && (
                <p className="mt-2 text-sm text-zinc-500">You don't have a username yet.</p>
              )}
            </section>

            <section className="classic-surface p-6 border">
              <h2 className="classic-title text-xl font-semibold mb-2">Email</h2>
              <p className="classic-text text-sm">Current: {email}</p>
              <div className="mt-3 flex gap-2">
                <input
                  className="classic-input w-full px-3 py-2 rounded border"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New email address"
                />
                <button
                  className="classic-btn-blue px-4 py-2 rounded"
                  onClick={handleChangeEmail}
                  disabled={loading}
                >
                  Change
                </button>
              </div>
            </section>

            <section className="classic-surface p-6 border">
              <h2 className="classic-title text-xl font-semibold mb-2">Password</h2>
              <div className="mt-2 flex gap-2">
                <input
                  type="password"
                  className="classic-input w-full px-3 py-2 rounded border"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                />
                <button
                  className="classic-btn-sage px-4 py-2 rounded"
                  onClick={handleChangePassword}
                  disabled={loading}
                >
                  Update
                </button>
              </div>
            </section>

            {message && (
              <div className="classic-surface classic-text p-3 border text-sm">{message}</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
