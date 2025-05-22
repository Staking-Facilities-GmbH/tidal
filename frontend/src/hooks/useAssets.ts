import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

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

export function useAssets(searchTag?: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (searchTag) {
      query = query.contains('tags', [searchTag]);
    }
    query
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setAssets(data || []);
        setLoading(false);
      });
  }, [searchTag]);

  return { assets, loading, error };
} 