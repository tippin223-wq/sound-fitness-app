import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

type SupabaseUserResponse = Awaited<ReturnType<typeof supabase.auth.getUser>>;

let pendingSupabaseUser: Promise<SupabaseUserResponse> | null = null;

const createSupabaseUserErrorResponse = (
  error: unknown,
): SupabaseUserResponse =>
  ({
    data: { user: null },
    error: error instanceof Error ? error : new Error(String(error)),
  }) as SupabaseUserResponse;

export const getSupabaseUser = async (): Promise<SupabaseUserResponse> => {
  if (!pendingSupabaseUser) {
    pendingSupabaseUser = supabase.auth
      .getUser()
      .catch(createSupabaseUserErrorResponse)
      .finally(() => {
        pendingSupabaseUser = null;
      });
  }

  return pendingSupabaseUser;
};
