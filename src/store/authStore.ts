import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  company_id: string | null;
  role: 'global_admin' | 'company_admin' | 'employee' | 'recipient';
  national_id: string | null;
  full_name: string;
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await get().fetchProfile(session.user.id);
      }
      set({ session, user: session?.user ?? null, isLoading: false });
    });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ isLoading: true });
      if (session?.user) {
        await get().fetchProfile(session.user.id);
      } else {
        set({ profile: null });
      }
      set({ session, user: session?.user ?? null, isLoading: false });
    });
  }
}));
