"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleMagicLink = async () => {
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setMessage("Check your email for a magic link!");
  };

  const handlePasswordSignIn = async () => {
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    else setMessage("Signed in successfully!");
  };

  const handlePasswordSignUp = async () => {
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setError(error.message);
    else setMessage("Sign up successful! Check your email to confirm.");
  };

  return (
    <div className="classic-main classic-surface max-w-md mx-auto p-6 border">
      <h2 className="classic-title text-2xl font-bold mb-6">
        {isSignUp ? "Create Account" : "Sign In"}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {message}
        </div>
      )}

      <div className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="classic-input w-full px-4 py-2 border rounded placeholder-zinc-500"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="classic-input w-full px-4 py-2 border rounded placeholder-zinc-500"
        />

        {isSignUp ? (
          <button
            onClick={handlePasswordSignUp}
            className="classic-btn-blue w-full px-4 py-2 rounded font-medium"
          >
            Sign Up
          </button>
        ) : (
          <button
            onClick={handlePasswordSignIn}
            className="classic-btn-blue w-full px-4 py-2 rounded font-medium"
          >
            Sign In
          </button>
        )}
      </div>

      <div className="mt-6 border-t border-zinc-300 pt-6">
        <p className="text-sm text-zinc-600 mb-4">
          Or sign in with a magic link
        </p>

        <button
          onClick={handleMagicLink}
          className="classic-btn-sage w-full px-4 py-2 rounded font-medium"
        >
          Send Magic Link
        </button>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setMessage(null);
          }}
          className="classic-title text-sm hover:underline"
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}
