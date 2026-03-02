import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// grab values and trim whitespace just in case
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = rawUrl ? rawUrl.trim() : "";
const supabaseAnonKey = rawKey ? rawKey.trim() : "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("MISSING Supabase env vars:", { supabaseUrl, supabaseAnonKey });
  throw new Error("Missing Supabase environment variables");
}

// Throw if URL doesn't look right
if (!supabaseUrl.startsWith("http")) {
  throw new Error(
    `Invalid supabase URL format. Got: "${supabaseUrl}". Expected to start with http:// or https://`
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// For server-side operations (API routes, background jobs, etc.) you
// should use a service role key so that row level security policies
// do not block legitimate writes. Store the key in an env var that is
// *not* exposed to the browser, for example `SUPABASE_SERVICE_ROLE_KEY`.
//
// Only initialize the admin client if a key is provided. This avoids
// blowing up when the module is pulled into client bundles (e.g. via
// a shared types file) during development.

let _adminClient: SupabaseClient<Database> | undefined;
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  _adminClient = createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
} else if (typeof window === "undefined") {
  // server startup without key is okay but we log so you're aware
  console.warn("SUPABASE_SERVICE_ROLE_KEY not set; admin client disabled");
}

export const supabaseAdmin = _adminClient;
