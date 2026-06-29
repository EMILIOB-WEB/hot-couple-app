import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pixbgwhijevdnmeglumn.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeGJnd2hpamV2ZG5tZWdsdW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2ODg3MTQsImV4cCI6MjA5ODI2NDcxNH0.gp2NM8c6RtUDHW8KiNOzoUyWbzPwFCgypcAxR9MxFEs";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);