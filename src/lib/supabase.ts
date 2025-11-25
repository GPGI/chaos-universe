import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "";

// Only create client if both URL and KEY are provided
export const supabase = SUPABASE_URL && SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : (null as any); // Graceful fallback - will need to handle null checks in components

export async function fetchUsers() {
  const { data, error } = await supabase.from("users").select("*");
  if (error) throw error;
  return data;
}

export async function addUser(user: { name: string; wallet: string }) {
  const { data, error } = await supabase.from("users").insert([user]);
  if (error) throw error;
  return data;
}
