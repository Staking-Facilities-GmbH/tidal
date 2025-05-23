import { useState, useEffect } from 'react';
import { Card, Flex, Text, Button, Box, Popover } from '@radix-ui/themes';
import { supabase } from '../utils/supabase';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useNetworkVariable } from '../networkConfig';
import { MIST_PER_SUI } from '@mysten/sui/utils';
import { InfoCircledIcon } from '@radix-ui/react-icons';

const PAGE_SIZE = 12;

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
  const [errorPopup, setErrorPopup] = useState<{ open: boolean, message: string }>({ open: false, message: '' });
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
              setPurchaseStatus(s => ({ ...s, [asset.id]: '' }));
              setErrorPopup({ open: true, message: 'Purchase failed: ' + (result.effects?.status?.error || 'Unknown error') });
            }
          },
          onError: (error) => {
            setPurchaseStatus(s => ({ ...s, [asset.id]: '' }));
            setErrorPopup({ open: true, message: 'Purchase failed: ' + error.message });
          },
        }
      );
    } catch (e: any) {
      setPurchaseStatus(s => ({ ...s, [asset.id]: '' }));
      setErrorPopup({ open: true, message: 'Purchase failed: ' + e.message });
    }
  };

  return (
    <Box style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', minHeight: '100vh' }}>
        <Flex direction="column" gap="6">
          <Text size="8" weight="bold" style={{ 
            letterSpacing: '0.04em',
            textAlign: 'center',
            background: 'linear-gradient(0deg, #137DFA 0%, #00eaff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
          }}>
            Find your favorite 3D assets here!
          </Text>

          <Flex gap="4" wrap="wrap" justify="center">
            <input
              className="radix-themes"
              placeholder="Filter by name"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              style={{
                background: 'rgba(20, 24, 34, 0.7)',
                border: '1px solid rgba(19,125,250,0.07)',
                borderRadius: 12,
                padding: '8px 16px',
                color: '#fff',
                width: '200px',
                height: '40px',
              }}
            />
          </Flex>

          <Flex gap="2" wrap="wrap" justify="center">
            {availableTags.map((tag) => (
              <Button
                key={tag}
                size="2"
                variant={selectedTags.includes(tag) ? 'solid' : 'soft'}
                style={{
                  background: selectedTags.includes(tag)
                    ? 'linear-gradient(90deg, #137DFA 0%, #00eaff 100%)'
                    : 'rgba(255,255,255,0.07)',
                  color: selectedTags.includes(tag)
                    ? '#fff'
                    : '#fff',
                  border: selectedTags.includes(tag)
                    ? '1.5px solid #00eaff'
                    : '1px solid rgba(19,125,250,0.10)',
                  borderRadius: 14,
                  fontWeight: 500,
                  fontSize: 15,
                  boxShadow: selectedTags.includes(tag)
                    ? '0 2px 8px #00eaff33'
                    : 'none',
                  padding: '6px 18px',
                  marginBottom: 2,
                  cursor: 'pointer',
                  transition: 'background 0.15s, box-shadow 0.15s, color 0.15s',
                }}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter(t => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
              >
                {tag}
              </Button>
            ))}
          </Flex>

          {selectedTags.length > 0 && (
            <Flex gap="2" wrap="wrap" justify="center">
              {selectedTags.map((tag) => (
                <Button
                  key={tag}
                  size="1"
                  variant="soft"
                  onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                  style={{
                    background: 'rgba(19,125,250,0.1)',
                    border: '1px solid rgba(19,125,250,0.2)',
                    color: '#fff',
                    borderRadius: 12,
                  }}
                >
                  {tag} ×
                </Button>
              ))}
            </Flex>
          )}

          {assetError && (
            <Text color="red" align="center">{assetError}</Text>
          )}

          {assetLoading ? (
            <Text align="center" style={{ color: '#fff' }}>Loading assets...</Text>
          ) : (
            <Flex direction="column" gap="4">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(260px, 1fr))',
                gap: '15px',
                justifyContent: 'center',
                alignItems: 'stretch',
                width: '100%',
                maxWidth: '100%',
              }}>
                {assetList.map((asset) => (
                  <Card key={asset.id} style={{
                    background: 'linear-gradient(135deg, rgba(30,32,60,0.98) 60%, rgba(19,125,250,0.10) 100%)',
                    borderRadius: 20,
                    boxShadow: '0 4px 24px #137dfa33',
                    padding: 0,
                    overflow: 'hidden',
                    border: '1.5px solid rgba(19,125,250,0.10)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    minWidth: 0,
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-6px) scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 8px 32px #137dfa55';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 4px 24px #137dfa33';
                  }}>
                    <div style={{ width: '100%', height: 200, overflow: 'hidden', background: 'linear-gradient(135deg, #e0f7fa 0%, #b3c6ff 100%)', borderTopLeftRadius: 20, borderTopRightRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      {asset.preview_gif_url ? (
                        <img 
                          className="preview-gif" 
                          src={asset.preview_gif_url} 
                          alt="3D Preview"
                          style={{
                            width: '100%',
                            objectFit: 'cover',
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            background: 'transparent',
                            display: 'block',
                            margin: 0,
                            padding: 0,
                          }}
                        />
                      ) : (
                        <span style={{ color: '#8a8fa3', fontSize: 18 }}>—</span>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <Flex gap="2" wrap="wrap" style={{ marginBottom: 2, rowGap: 4 }}>
                        {asset.tags.map((tag: string) => (
                          <Text key={tag} size="1" style={{
                            background: 'linear-gradient(90deg,rgb(253, 253, 253) 0%,rgb(63, 179, 189) 100%)',
                            color: '#000',
                            padding: '1.5px 10px',
                            borderRadius: 16,
                            border: '1px solid rgba(19,125,250,0.18)',
                            fontWeight: 500,
                            fontSize: 12,
                            boxShadow: '0 1px 4px #137dfa22',
                            marginBottom: 0,
                          }}>
                            {tag}
                          </Text>
                        ))}
                      </Flex>
                      <Flex align="center" gap="2" style={{ marginBottom: 1 }}>
                        <Text weight="bold" size="4" style={{ color: '#fff', letterSpacing: 0.2, margin: 0 }}>{asset.name}</Text>
                        <Popover.Root>
                          <Popover.Trigger>
                            <Button
                              variant="ghost"
                              style={{
                                padding: 0,
                                width: 22,
                                height: 22,
                                minWidth: 22,
                                borderRadius: '50%',
                                background: 'rgba(19,125,250,0.13)',
                                border: '1px solid rgba(19,125,250,0.18)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                                marginLeft: 4,
                                cursor: 'pointer',
                                transition: 'background 0.15s, box-shadow 0.15s',
                              }}
                              onMouseOver={e => e.currentTarget.style.background = 'rgba(19,125,250,0.22)'}
                              onMouseOut={e => e.currentTarget.style.background = 'rgba(19,125,250,0.13)'}
                            >
                              <InfoCircledIcon width={16} height={16} />
                            </Button>
                          </Popover.Trigger>
                          <Popover.Content>
                            <Box style={{ 
                              background: 'rgba(30, 32, 60, 0.98)',
                              borderRadius: 14,
                              padding: 14,
                              maxWidth: 320,
                              border: '1px solid rgba(19,125,250,0.18)',
                              boxShadow: '0 2px 12px #137dfa33',
                            }}>
                              <Text style={{ color: '#fff', fontSize: 15 }}>{asset.description}</Text>
                            </Box>
                          </Popover.Content>
                        </Popover.Root>
                      </Flex>
                      <Flex align="center" gap="2" style={{ marginBottom: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0 }}>
                          Price: {Number(asset.price) < 100000 ? `${Number(asset.price)}` + " MIST" : `${Number(asset.price) / Number(MIST_PER_SUI)}` + " SUI"}
                        </Text>
                      </Flex>
                      {hasUserPurchased(asset) ? (
                        <Button 
                          style={{ 
                            width: '100%',
                            background: 'linear-gradient(90deg, #137DFA 0%, #00eaff 100%)',
                            color: '#fff',
                            transform: 'none',
                            borderRadius: 18,
                            fontWeight: 700,
                            fontSize: 16,
                            boxShadow: '0 2px 12px #00eaff33',
                            marginTop: 6,
                          }}
                          onClick={() => window.location.href = `/purchases`}
                        >
                          View in My Purchases
                        </Button>
                      ) : (
                        <Button
                          style={{ 
                            alignSelf: 'center',
                            width: '50%',
                            background: 'linear-gradient(90deg, #137DFA 0%, #00eaff 100%)',
                            color: '#fff',
                            transform: 'none',
                            borderRadius: 18,
                            fontWeight: 700,
                            fontSize: 16,
                            boxShadow: '0 2px 12px #00eaff33',
                            marginTop: 6,
                            transition: 'transform 0.12s, filter 0.12s',
                          }}
                          onMouseOver={e => { e.currentTarget.style.filter = 'brightness(1.08)'; e.currentTarget.style.transform = 'scale(1.03)'; }}
                          onMouseOut={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
                          onClick={() => handlePurchase(asset)}
                          disabled={purchaseStatus[asset.id]?.startsWith('Processing')}
                        >
                          {purchaseStatus[asset.id]?.startsWith('Processing') ? 'Processing...' : 'Buy'}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {assetList.length === 0 && (
                <Text align="center" style={{ color: '#fff' }}>No assets found</Text>
              )}

              <Flex justify="center" align="center" gap="4" mt="4">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{
                    background: 'rgba(20, 24, 34, 0.7)',
                    border: '1px solid rgba(19,125,250,0.07)',
                    color: '#fff',
                    borderRadius: 12,
                  }}
                >
                  Previous
                </Button>
                <Text style={{ color: '#fff' }}>Page {page} of {totalPages}</Text>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    background: 'rgba(20, 24, 34, 0.7)',
                    border: '1px solid rgba(19,125,250,0.07)',
                    color: '#fff',
                    borderRadius: 12,
                  }}
                >
                  Next
                </Button>
              </Flex>
            </Flex>
          )}
        </Flex>

        {/* Error Popup */}
        {errorPopup.open && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
            onClick={() => setErrorPopup({ open: false, message: '' })}
          >
            <div style={{
              background: 'rgba(30, 32, 60, 0.98)',
              borderRadius: 16,
              padding: '32px 28px',
              minWidth: 320,
              maxWidth: '90vw',
              boxShadow: '0 4px 32px #137dfa55',
              border: '1.5px solid #00eaff44',
              color: '#fff',
              fontSize: 18,
              textAlign: 'center',
              position: 'relative',
            }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ marginBottom: 18, fontWeight: 600, fontSize: 20, color: '#00eaff' }}>Purchase Error</div>
              <div style={{ marginBottom: 18 }}>{errorPopup.message}</div>
              <Button
                style={{
                  background: 'linear-gradient(90deg, #137DFA 0%, #00eaff 100%)',
                  color: '#fff',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 16,
                  marginTop: 8,
                  width: '100%',
                }}
                onClick={() => setErrorPopup({ open: false, message: '' })}
              >
                Close
              </Button>
            </div>
          </div>
        )}
    </Box>
  );
} 