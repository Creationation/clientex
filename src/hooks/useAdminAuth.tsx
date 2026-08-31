import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Auth admin.
 *
 * Avec Supabase : session Supabase + verification du role via la table
 * admin_users (fonction SECURITY DEFINER is_admin()). Aucune donnee sensible
 * n'est accessible sans ce role, les policies RLS font foi cote serveur.
 *
 * Sans Supabase (mode demo) : un simple deverrouillage local pour pouvoir
 * montrer le dashboard. Aucune donnee reelle n'est en jeu.
 */

const DEMO_KEY = "delherren_demo_admin";

interface AdminAuthValue {
  ready: boolean;
  isAdmin: boolean;
  email: string | null;
  demo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const checkAdmin = useCallback(async (userId: string, userEmail: string | null) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) console.error("[admin] role check", error.message);
    setIsAdmin(Boolean(data));
    setEmail(userEmail);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      try {
        setIsAdmin(localStorage.getItem(DEMO_KEY) === "1");
      } catch {
        /* ignore */
      }
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) void checkAdmin(user.id, user.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        setTimeout(() => void checkAdmin(user.id, user.email ?? null), 0);
      } else {
        setIsAdmin(false);
        setEmail(null);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, [checkAdmin]);

  const signIn = useCallback(async (mail: string, password: string) => {
    if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
    if (error) throw new Error(error.message);
  }, []);

  const signInDemo = useCallback(() => {
    try {
      localStorage.setItem(DEMO_KEY, "1");
    } catch {
      /* ignore */
    }
    setIsAdmin(true);
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(DEMO_KEY);
    } catch {
      /* ignore */
    }
    if (supabase) await supabase.auth.signOut();
    setIsAdmin(false);
    setEmail(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ ready, isAdmin, email, demo: !isSupabaseConfigured, signIn, signInDemo, signOut }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
