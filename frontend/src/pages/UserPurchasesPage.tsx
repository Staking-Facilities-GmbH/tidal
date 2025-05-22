import { useState, useEffect } from 'react';
import { Card, Flex, Text, Button, Box } from '@radix-ui/themes';
import { supabase } from '../utils/supabase';
import { useCurrentAccount, useSuiClient, useSignPersonalMessage } from '@mysten/dapp-kit';
import { EncryptedUpload } from '../components/upload/EncryptedUpload';
import { useNetworkVariable } from '../networkConfig';
import { SealClient, SessionKey, EncryptedObject, NoAccessError, getAllowlistedKeyServers } from '@mysten/seal';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';

const PAGE_SIZE = 10;

export function UserPurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const [downloadStatus, setDownloadStatus] = useState<{[assetId: string]: string}>({});
  const [downloading, setDownloading] = useState<{[assetId: string]: boolean}>({});
  const [currentSessionKey, setCurrentSessionKey] = useState<SessionKey | null>(null);

  const sealClient = new SealClient({
    suiClient: suiClient as any,
    serverObjectIds: getAllowlistedKeyServers('testnet'),
    verifyKeyServers: false,
  });

  const fetchPurchases = async () => {
    if (!account?.address) return;
    
    setLoading(true);
    setError(null);

    const { data, error, count } = await supabase
      .from('purchases')
      .select(`
        *,
        assets (*)
      `)
      .eq('user_address', account.address)
      .order('purchased_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (error) {
      setError(error.message);
      setPurchases([]);
    } else {
      setPurchases(data || []);
      setTotalPages(count ? Math.ceil(count / PAGE_SIZE) : 1);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPurchases();
  }, [page, account?.address]);

  const handleDownload = async (asset: any) => {
    if (!account?.address) {
      alert('Please connect your wallet first');
      return;
    }
    console.log('[Download] Starting download for asset:', asset);
    setDownloading(s => ({ ...s, [asset.id]: true }));
    setDownloadStatus(s => ({ ...s, [asset.id]: 'Decrypting and downloading...' }));
    try {
      // Check if we have a valid session key
      if (
        currentSessionKey &&
        !currentSessionKey.isExpired() &&
        currentSessionKey.getAddress() === account.address
      ) {
        console.log('[Download] Using existing session key:', currentSessionKey);
        await handleDecrypt(asset, currentSessionKey);
        return;
      }
      // Create new session key
      const sessionKey = new SessionKey({
        address: account.address,
        packageId,
        ttlMin: 10,
      });
      console.log('[Download] Created new session key:', sessionKey);
      // Get personal message signature
      signPersonalMessage(
        { message: sessionKey.getPersonalMessage() },
        {
          onSuccess: async (result) => {
            try {
              console.log('[Download] Got personal message signature:', result.signature);
              await sessionKey.setPersonalMessageSignature(result.signature);
              await handleDecrypt(asset, sessionKey);
              setCurrentSessionKey(sessionKey);
            } catch (e: any) {
              console.error('[Download] Decryption error:', e);
              setDownloadStatus(s => ({ ...s, [asset.id]: 'Download failed: ' + e.message }));
            }
          },
          onError: (error) => {
            console.error('[Download] Signature error:', error);
            setDownloadStatus(s => ({ ...s, [asset.id]: 'Failed to sign message: ' + error.message }));
          },
        },
      );
    } catch (e: any) {
      console.error('[Download] Download error:', e);
      setDownloadStatus(s => ({ ...s, [asset.id]: 'Download failed: ' + e.message }));
    } finally {
      setDownloading(s => ({ ...s, [asset.id]: false }));
    }
  };

  const handleDecrypt = async (asset: any, sessionKey: SessionKey) => {
    try {
      // Explicit allowlist membership check (added for user feedback/debugging)
      console.log('[Decrypt] Checking allowlist:', asset.allowlist_id);
      const allowlistObj = await suiClient.getObject({
        id: asset.allowlist_id,
        options: { showContent: true }
      });
      console.log('[Decrypt] Allowlist object:', allowlistObj);
      const fields = (allowlistObj.data?.content as { fields: any })?.fields || {};
      console.log('[Decrypt] Allowlist fields:', fields);
      const allowlist = fields.list || [];
      console.log('[Decrypt] Allowlist members:', allowlist);
      console.log('[Decrypt] User address:', account?.address);
      if (!allowlist.includes(account?.address)) {
        throw new Error('You are not in the allowlist for this asset');
      }

      // Log namespace and blob id
      let namespace = asset.allowlist_id;
      if (namespace && typeof namespace === 'object') {
        if (namespace.id) {
          namespace = namespace.id;
        } else if (namespace.value) {
          namespace = namespace.value;
        } else {
          namespace = JSON.stringify(namespace);
        }
      }
      if (namespace && namespace.startsWith('0x')) {
        namespace = namespace.slice(2);
      }
      console.log('[Decrypt] Allowlist namespace:', namespace);

      console.log('[Decrypt] Downloading encrypted blob from:', asset.file_url);
      const response = await fetch(asset.file_url);
      if (!response.ok) throw new Error('Failed to fetch encrypted file');
      const encryptedData = new Uint8Array(await response.arrayBuffer());
      const encryptedObject = EncryptedObject.parse(encryptedData);
      const id = encryptedObject.id;
      console.log('[Decrypt] Encrypted object ID:', id);
      // Check if blob id starts with namespace
      if (namespace && id) {
        console.log('[Decrypt] Blob ID starts with namespace:', id.startsWith(namespace));
      } else {
        console.log('[Decrypt] Unable to check if blob ID starts with namespace (missing values)');
      }

      // Create moveCallConstructor function
      const moveCallConstructor = (tx: Transaction, id: string) => {
        tx.moveCall({
          target: `${packageId}::tidal::seal_approve`,
          arguments: [
            tx.pure.vector('u8', fromHex(id)),
            tx.object(asset.allowlist_id),
          ],
        });
      };

      // Build transaction using moveCallConstructor
      const tx = new Transaction();
      moveCallConstructor(tx, id);
      tx.setSender(account?.address!);
      tx.setGasBudget(10000000);
      const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
      console.log('[Decrypt] Transaction bytes:', txBytes);

      try {
        console.log('[Decrypt] Fetching keys...');
        try {
          await sealClient.fetchKeys({ 
            ids: [id], 
            txBytes, 
            sessionKey,
            threshold: 2,
            verifyKeyServers: false 
          });
        } catch (keyError: any) {
          console.error('[Decrypt] Key server error details:', {
            status: keyError.status,
            message: keyError.message,
            response: keyError.response,
            stack: keyError.stack
          });
          throw keyError;
        }
        console.log('[Decrypt] Decrypting...');
        const decrypted = await sealClient.decrypt({ 
          sessionKey, 
          data: encryptedData, 
          txBytes,
          verifyKeyServers: false 
        });
        // Download file
        let filename = (asset.name ? asset.name.replace(/\s+/g, '_') : 'decrypted_file') + '.gltf';
        const blob = new Blob([decrypted], { type: 'model/gltf+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setDownloadStatus(s => ({ ...s, [asset.id]: 'Download complete!' }));
        console.log('[Decrypt] Download complete:', filename);
      } catch (err) {
        const errorMsg = err instanceof NoAccessError
          ? 'No access to decryption keys'
          : 'Unable to decrypt files, try again';
        console.error('[Decrypt] Decryption error:', err);
        setDownloadStatus(s => ({ ...s, [asset.id]: errorMsg }));
        throw err;
      }
    } catch (e: any) {
      console.error('[Decrypt] Download error:', e);
      setDownloadStatus(s => ({ ...s, [asset.id]: 'Download failed: ' + e.message }));
      throw e;
    }
  };

  return (
    <Box>
      <Card>
        <Flex direction="column" gap="4">
          <Text size="5" weight="bold">My Purchases</Text>

          {error && (
            <Text color="red">{error}</Text>
          )}

          {loading ? (
            <Text>Loading purchases...</Text>
          ) : (
            <Flex direction="column" gap="2">
              {purchases.map((purchase) => (
                <Card key={purchase.id}>
                  <Flex direction="column" gap="2">
                    <div className="asset-info">
                      {purchase.assets.preview_gif_url && (
                        <img className="preview-gif" src={purchase.assets.preview_gif_url} alt="3D Preview" />
                      )}
                      <div className="asset-details">
                        <Text weight="bold" size="4">{purchase.assets.name}</Text>
                        <Text>{purchase.assets.description}</Text>
                        <Text>Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}</Text>
                        <Button onClick={() => handleDownload(purchase.assets)} disabled={downloading[purchase.assets.id]}>
                          Download 3D Model
                        </Button>
                        {downloadStatus[purchase.assets.id] && !downloadStatus[purchase.assets.id].startsWith('Decrypting') && (
                          <Text color={downloadStatus[purchase.assets.id].startsWith('Download complete') ? 'green' : 'red'}>
                            {downloadStatus[purchase.assets.id]}
                          </Text>
                        )}
                      </div>
                    </div>
                  </Flex>
                </Card>
              ))}

              {purchases.length === 0 && (
                <Text>No purchases found</Text>
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

      {selectedAsset && (
        <Card mt="4">
          <EncryptedUpload 
            initialAsset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
          />
        </Card>
      )}
    </Box>
  );
} 