import { supabase } from "../lib/supabase";

export const signIn = async (email: string, pass: string) => {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (authError) throw authError;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", authData.user.id)
    .single();

  if (profileError) throw profileError;

  return { user: authData.user, profile };
};