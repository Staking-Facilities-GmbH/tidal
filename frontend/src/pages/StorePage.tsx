import { useState, useEffect } from 'react';
import { Card, Flex, Text, Button, Box, Popover } from '@radix-ui/themes';
import { supabase } from '../utils/supabase';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useNetworkVariable } from '../networkConfig';
import { MIST_PER_SUI } from '@mysten/sui/utils';

const PAGE_SIZE = 10;

export function StorePage() {
  const [assetList, setAssetList] = useState<any[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterName, setFilterName] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [userPurchases, setUserPurchases] = useState<string[]>([]);
  const [purchaseStatus, setPurchaseStatus] = useState<{ [assetId: string]: string }>({});
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

  // Fetch available tags
  const fetchAvailableTags = async () => {
    const { data, error } = await supabase
      .from('assets')
      .select('tags');

    if (!error && data) {
      const allTags = data.flatMap(asset => asset.tags || []);
      const uniqueTags = [...new Set(allTags)].sort();
      setAvailableTags(uniqueTags);
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
    if (selectedTags.length > 0) {
      query = query.contains('tags', selectedTags);
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
    fetchAvailableTags();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [page, filterName, selectedTags, account?.address]);

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
            className="radix-themes w-[200px]"
            placeholder="Filter by name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />

          <Popover.Root>
            <Popover.Trigger>
              <Button
                variant="soft"
                style={{
                  justifyContent: 'flex-start',
                  width: 'fit-content',
                  height: '32px',
                  transform: 'none'
                }}
              >
                Select tags to filter {selectedTags.length > 0 && `(${selectedTags.length})`}
              </Button>
            </Popover.Trigger>
            <Popover.Content>
              <Flex direction="column" gap="2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {selectedTags.length > 0 && (
                  <div
                    onClick={() => setSelectedTags([])}
                    style={{
                      padding: '8px',
                      cursor: 'pointer',
                      width: '100%',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.2s',
                      borderBottom: '1px solid var(--gray-5)',
                      marginBottom: '4px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-3)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Flex align="center" gap="2">
                      <Text color="red">Clear filters</Text>
                    </Flex>
                  </div>
                )}
                {availableTags.map((tag) => (
                  <div
                    key={tag}
                    onClick={() => {
                      if (selectedTags.includes(tag)) {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                    style={{
                      padding: '8px',
                      cursor: 'pointer',
                      width: '100%',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-3)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Flex align="center" gap="2">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        readOnly
                        style={{ margin: 0 }}
                      />
                      {tag}
                    </Flex>
                  </div>
                ))}
              </Flex>
            </Popover.Content>
          </Popover.Root>

          {selectedTags.length > 0 && (
            <Flex gap="2" wrap="wrap">
              {selectedTags.map((tag) => (
                <Button
                  key={tag}
                  size="1"
                  variant="soft"
                  onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                >
                  {tag} ×
                </Button>
              ))}
            </Flex>
          )}

          {assetError && (
            <Text color="red">{assetError}</Text>
          )}

          {assetLoading ? (
            <Text>Loading assets...</Text>
          ) : (
            <Flex direction="column" gap="2">
              {assetList.map((asset) => (
                <Card key={asset.id}>
                  <div className="asset-info">
                    {asset.preview_gif_url && (
                      <img className="preview-gif" src={asset.preview_gif_url} alt="3D Preview" />
                    )}
                    <div className="asset-details">
                      <Text weight="bold" size="4">{asset.name}</Text>
                      <Text>{asset.description}</Text>
                      <Text>Price: {Number(asset.price) < 100000 ? `${Number(asset.price)}` + " MIST" : `${Number(asset.price) / Number(MIST_PER_SUI)}` + " SUI"}</Text>
                      <Text>Tags: {asset.tags.join(', ')}</Text>
                      {hasUserPurchased(asset) ? (
                        <Button style={{ transform: 'none' }}
                          onClick={() => window.location.href = `/purchases`}
                        >
                          View in My Purchases
                        </Button>
                      ) : (
                        <Button
                          style={{ transform: 'none' }}
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