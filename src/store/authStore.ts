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
}

let authListenerAdded = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
    }
    
    set({ profile: data || null });
  },

  initialize: () => {
    if (authListenerAdded) return;
    authListenerAdded = true;

    // Timeout de seguridad de 5 segundos para evitar bloqueos infinitos (F5/Reload)
    const timeoutId = setTimeout(() => {
      if (get().isLoading) {
        console.warn('Auth initialization timed out. Forcing cleanup of zombie state.');
        set({ isLoading: false, user: null, session: null, profile: null });
        supabase.auth.signOut().catch(console.error);
      }
    }, 5000);

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await get().fetchProfile(session.user.id);
        }
        set({ session, user: session?.user ?? null, isLoading: false });
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('Error during auth initialization:', error);
        set({ isLoading: false, user: null, session: null, profile: null });
        clearTimeout(timeoutId);
      }
    };

    initAuth();

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, profile: null, isLoading: false });
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        set({ session, user: session?.user ?? null });
        return;
      }

      // Ignoramos INITIAL_SESSION ya que initAuth se encarga de la hidratación inicial.
      // Solo mostramos carga para un login manual (SIGNED_IN).
      if (event === 'SIGNED_IN') {
        if (!get().user) {
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
  }
}));
