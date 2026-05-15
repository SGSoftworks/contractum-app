import { supabase } from './supabase'
import type { Profile } from '@/store/profileStore'

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return {
    data: data as Profile | null,
    error,
  }
}
