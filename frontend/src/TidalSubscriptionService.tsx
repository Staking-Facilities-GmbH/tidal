import React, { useState } from 'react';
import { supabase } from './utils/supabase';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';

export default function TidalSubscriptionService() {
  const account = useCurrentAccount();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // TODO: Replace with your actual contract call logic
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !account) {
      setMessage('Please connect your wallet and select a file.');
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      // 1. Upload file to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('assets')
        .upload(`public/${file.name}`, file);

      if (storageError) throw storageError;

      const { publicUrl } = supabase.storage.from('assets').getPublicUrl(storageData?.path || '').data;

      // 2. Register asset on-chain (replace with your tidal-move contract logic)
      // Example: signAndExecute({ ...tidalMoveTx })
      // const txResult = await signAndExecute({ ... });

      // 3. Store asset metadata in Supabase
      const { error: dbError } = await supabase.from('assets').insert([
        {
          name,
          description,
          price: Number(price),
          tags: tags.split(',').map(t => t.trim()),
          file_url: publicUrl,
          creator_address: account.address,
        },
      ]);
      if (dbError) throw dbError;

      setMessage('Asset uploaded and registered successfully!');
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Upload Asset & Register Subscription</h2>
      <form onSubmit={handleUpload} className="space-y-4">
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="w-full border px-2 py-1 rounded" />
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full border px-2 py-1 rounded" />
        <input type="number" placeholder="Price (SUI)" value={price} onChange={e => setPrice(e.target.value)} className="w-full border px-2 py-1 rounded" />
        <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} className="w-full border px-2 py-1 rounded" />
        <button type="submit" disabled={loading} className="bg-blue-500 text-white px-4 py-2 rounded">
          {loading ? 'Uploading...' : 'Upload & Register'}
        </button>
      </form>
      {message && <div className="mt-4 text-center">{message}</div>}
    </div>
  );
} 