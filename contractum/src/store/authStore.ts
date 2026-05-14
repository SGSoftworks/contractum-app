import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  national_id: string | null;
  is_global_admin: boolean;
  is_approved: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
  initialize: () => void;
  fetchProfile: (userId: string) => Promise<void>;
  resetState: () => void;
}

// Bandera para evitar doble registro del listener de auth
let authListenerAdded = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  // Limpia todos los estados a un estado limpio sin sesión
  resetState: () => {
    set({ user: null, session: null, profile: null, isLoading: false });
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    } finally {
      set({ user: null, session: null, profile: null, isLoading: false });
    }
  },

  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      set({ profile: data || null });
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      set({ profile: null });
    }
  },

  initialize: () => {
    if (authListenerAdded) return;
    authListenerAdded = true;

    // Timeout de seguridad: si en 2 segundos no hay respuesta, limpiamos y mostramos login
    const TIMEOUT_MS = 2000;
    const timeoutId = setTimeout(() => {
      if (get().isLoading) {
        console.warn('[AuthStore] Timeout: forcing cleanup of zombie state after 2s.');
        get().resetState();
        supabase.auth.signOut().catch(() => {});
      }
    }, TIMEOUT_MS);

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        // Token corrupto o expirado → forzamos limpieza completa
        if (error) {
          console.error('[AuthStore] Session error, forcing signout:', error);
          await supabase.auth.signOut().catch(() => {});
          get().resetState();
          return;
        }

        if (session?.user) {
          await get().fetchProfile(session.user.id);
        }

        set({ session, user: session?.user ?? null, isLoading: false });
      } catch (err) {
        console.error('[AuthStore] Unexpected error during init:', err);
        get().resetState();
      } finally {
        clearTimeout(timeoutId);
      }
    };

    initAuth();

    supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignoramos eventos que solo son ruido de red/foco de pestaña
      if (event === 'INITIAL_SESSION') {
        // Ya manejado por initAuth — no hacer nada
        return;
      }

      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, profile: null, isLoading: false });
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Solo actualizamos tokens, sin re-lanzar carga de perfil
        set({ session, user: session?.user ?? null });
        return;
      }

      if (event === 'SIGNED_IN') {
        // Solo activamos loading si no hay usuario previo (login manual, no F5)
        const alreadyHasUser = !!get().user;
        if (!alreadyHasUser) {
          set({ isLoading: true });
        }
        try {
          if (session?.user) {
            await get().fetchProfile(session.user.id);
          } else {
            set({ profile: null });
          }
        } finally {
          set({ session, user: session?.user ?? null, isLoading: false });
        }
      }
    });
  },
}));
