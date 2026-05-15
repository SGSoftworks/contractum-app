import { create } from 'zustand'

export interface Profile {
  id: string
  full_name: string
  email: string
  national_id: string | null
  is_global_admin: boolean
  is_approved: boolean
  created_at: string
}

interface ProfileState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}))
