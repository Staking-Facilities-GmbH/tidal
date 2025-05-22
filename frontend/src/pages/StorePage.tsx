import { useState, useEffect } from 'react';
import { Card, Flex, Text, Button, Box } from '@radix-ui/themes';
import { supabase } from '../utils/supabase';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useNetworkVariable } from '../networkConfig';

const PAGE_SIZE = 10;

export function StorePage() {
  const [assetList, setAssetList] = useState<any[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterName, setFilterName] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [userPurchases, setUserPurchases] = useState<string[]>([]);
  const [purchaseStatus, setPurchaseStatus] = useState<{[assetId: string]: string}>({});
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  // Fetch user purchases
  const fetchUserPurchases = async () => {
    if (!account?.address) return;
    const { data, error } = await supabase
      .from('purchases')
      .select('asset_id')
      .eq('user_address', account.address);
    if (!error && data) {
      setUserPurchases(data.map((row: any) => row.asset_id));
    }
  };

  // Fetch assets
  const fetchAssets = async () => {
    setAssetLoading(true);
    setAssetError(null);
    let query = supabase.from('assets').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (filterName) {
      query = query.ilike('name', `%${filterName}%`);
    }
    if (filterTag) {
      query = query.contains('tags', [filterTag]);
    }
    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, error, count } = await query;
    if (error) {
      setAssetError(error.message);
      setAssetList([]);
    } else {
      setAssetList(data || []);
      setTotalPages(count ? Math.ceil(count / PAGE_SIZE) : 1);
    }
    setAssetLoading(false);
    fetchUserPurchases();
  };

  useEffect(() => {
    fetchAssets();
  }, [page, filterName, filterTag, account?.address]);

  // Helper: check if user has purchased asset
  const hasUserPurchased = (asset: any) => userPurchases.includes(asset.id);

  const handlePurchase = async (asset: any) => {
    if (!account?.address) {
      alert('Please connect your wallet first');
      return;
    }
    setPurchaseStatus(s => ({ ...s, [asset.id]: 'Processing purchase...' }));
    try {
      // Fetch allowlist object to get users and fee
      const allowlistObj = await suiClient.getObject({ id: asset.allowlist_id, options: { showContent: true } });
      const fields = (allowlistObj.data?.content as { fields: any })?.fields || {};
      const fee = fields.fee || 0;
      const capId = asset.cap_id || asset.capId || asset.cap || '';
      if (!capId) throw new Error('No cap ID found for asset');
      // First split a coin with the exact fee amount
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(fee)]);
      // Then call add with the coin
      tx.moveCall({
        target: `${packageId}::tidal::add`,
        arguments: [
          coin,
          tx.object(asset.allowlist_id),
          tx.object(capId),
          tx.pure.address(account.address),
        ],
      });
      tx.setGasBudget(10000000);
      await signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: async (result) => {
            if (result.effects?.status?.status === 'success') {
              setPurchaseStatus(s => ({ ...s, [asset.id]: 'Purchase successful!' }));
              await supabase.from('purchases').insert([
                { asset_id: asset.id, user_address: account.address }
              ]);
              fetchAssets();
            } else {
              setPurchaseStatus(s => ({ ...s, [asset.id]: 'Purchase failed: ' + (result.effects?.status?.error || 'Unknown error') }));
            }
          },
          onError: (error) => {
            setPurchaseStatus(s => ({ ...s, [asset.id]: 'Purchase failed: ' + error.message }));
          },
        }
      );
    } catch (e: any) {
      setPurchaseStatus(s => ({ ...s, [asset.id]: 'Purchase failed: ' + e.message }));
    }
  };

  return (
    <Box>
      <Card>
        <Flex direction="column" gap="4">
          <Text size="5" weight="bold">Asset Store</Text>
          
          <input
            className="radix-themes"
            placeholder="Filter by name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />

          <input
            className="radix-themes"
            placeholder="Filter by tag"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          />

          {assetError && (
            <Text color="red">{assetError}</Text>
          )}

          {assetLoading ? (
            <Text>Loading assets...</Text>
          ) : (
            <Flex direction="column" gap="2">
              {console.log('[StorePage DEBUG] assetList:', assetList)}
              {assetList.map((asset) => (
                <Card key={asset.id}>
                  <div className="asset-info">
                    {asset.preview_gif_url && (
                      <img className="preview-gif" src={asset.preview_gif_url} alt="3D Preview" />
                    )}
                    <div className="asset-details">
                      <Text weight="bold" size="4">{asset.name}</Text>
                      <Text>{asset.description}</Text>
                      <Text>Price: {asset.price} SUI</Text>
                      <Text>Tags: {asset.tags.join(', ')}</Text>
                      {hasUserPurchased(asset) ? (
                        <Button 
                          onClick={() => window.location.href = `/purchases`}
                        >
                          View in My Purchases
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handlePurchase(asset)}
                          disabled={purchaseStatus[asset.id]?.startsWith('Processing')}
                        >
                          Buy 3D Asset
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {assetList.length === 0 && (
                <Text>No assets found</Text>
              )}

              <Flex justify="between" align="center">
                <Button 
                  disabled={page === 1} 
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Text>Page {page} of {totalPages}</Text>
                <Button 
                  disabled={page === totalPages} 
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </Flex>
            </Flex>
          )}
        </Flex>
      </Card>
    </Box>
  );
} 