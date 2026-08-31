import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { db } from "@/lib/db";

/**
 * Authentification du dashboard, e-mail + mot de passe dans les deux modes.
 *
 * Supabase : Auth gere le mot de passe, la table admin_users donne le droit
 * d'entrer. Les policies RLS font foi cote serveur, l'ecran ci-dessous n'est
 * qu'une porte d'entree.
 *
 * Demo : les comptes vivent dans le localStorage. Aucun secret reel n'est en
 * jeu, cela permet de montrer le dashboard sans backend.
 */

const SESSION_KEY = "delherren_demo_session";

interface AdminAuthValue {
  ready: boolean;
  isAdmin: boolean;
  email: string | null;
  name: string | null;
  demo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  const checkAdmin = useCallback(async (userId: string, userEmail: string | null) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id, name")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) console.error("[admin] verification du role", error.message);
    setIsAdmin(Boolean(data));
    setEmail(userEmail);
    setName((data as { name?: string } | null)?.name ?? null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const session = JSON.parse(raw) as { email: string; name: string };
          setIsAdmin(true);
          setEmail(session.email);
          setName(session.name);
        }
      } catch {
        /* session illisible : on reste deconnecte */
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
        setName(null);
      }
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, [checkAdmin]);

  const signIn = useCallback(async (mail: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      const account = await db.verifyDemoLogin(mail, password);
      if (!account) throw new Error("INVALID_CREDENTIALS");
      try {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ email: account.email, name: account.name }),
        );
      } catch {
        /* ignore */
      }
      setIsAdmin(true);
      setEmail(account.email);
      setName(account.name);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: mail.trim(),
      password,
    });
    if (error) throw new Error("INVALID_CREDENTIALS");

    // Un compte Auth valide ne suffit pas : il faut etre dans admin_users.
    const { data: row } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!row) {
      await supabase.auth.signOut();
      throw new Error("NOT_ADMIN");
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    if (supabase) await supabase.auth.signOut();
    setIsAdmin(false);
    setEmail(null);
    setName(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ ready, isAdmin, email, name, demo: !isSupabaseConfigured, signIn, signOut }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth doit etre utilise dans AdminAuthProvider");
  return ctx;
}
