/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
console.log('=== Supabase Configuration ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey);
console.log('Environment Variables:');
console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('- VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('=============================');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Debug function to check auth state
export const checkAuth = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('=== Auth State ===');
  console.log('Current session:', session);
  console.log('Auth error:', error);
  console.log('==================');
  return { session, error };
};

// Asset table types
export interface Asset {
  id: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
  file_url: string;
  creator_address: string;
  created_at: string;
  updated_at: string;
}

// Asset table operations
export const assets = {
  async getAll() {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Asset[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Asset;
  },

  async create(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('assets')
      .insert([asset])
      .select()
      .single();
    
    if (error) throw error;
    return data as Asset;
  },

  async update(id: string, updates: Partial<Asset>) {
    const { data, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Asset;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Asset[];
  },

  async filterByTags(tags: string[]) {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .contains('tags', tags)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Asset[];
  }
}; 