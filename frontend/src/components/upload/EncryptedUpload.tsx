import { WalrusUpload } from '../../EncryptAndUpload';
import { Card, Flex, Text, Button, Box, Popover, Select, Dialog } from '@radix-ui/themes';
import { useState, useEffect, ChangeEvent } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { useNetworkVariable } from '../../networkConfig';
import { supabase } from '../../utils/supabase';
import { getAllowlistedKeyServers, SealClient, SessionKey, EncryptedObject, NoAccessError } from '@mysten/seal';
import { fromHex } from '@mysten/sui/utils';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const PAGE_SIZE = 10;

interface EncryptedUploadProps {
  initialAsset?: any;
  onClose?: () => void;
  showAssetList?: boolean;
}

export function EncryptedUpload({ initialAsset, onClose, showAssetList = true }: EncryptedUploadProps) {
  const packageId = useNetworkVariable('packageId');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [fee, setFee] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [allowlistId, setAllowlistId] = useState<string | null>(null);
  const [capId, setCapId] = useState<string | null>(null);
  const [uploadedBlobInfo, setUploadedBlobInfo] = useState<any>(null);
  const [publishStatus, setPublishStatus] = useState<string>('');
  const [assetList, setAssetList] = useState<any[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterName, setFilterName] = useState('');
  const [filterTag, setFilterTag] = useState('');
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
  const account = useCurrentAccount();
  const [purchaseStatus, setPurchaseStatus] = useState<{ [assetId: string]: string }>({});
  const [downloadStatus, setDownloadStatus] = useState<{ [assetId: string]: string }>({});
  const [downloading, setDownloading] = useState<{ [assetId: string]: boolean }>({});
  const [userPurchases, setUserPurchases] = useState<string[]>([]);
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const [currentSessionKey, setCurrentSessionKey] = useState<SessionKey | null>(null);
  const [asset, setAsset] = useState<any | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [encryptedObjectId, setEncryptedObjectId] = useState<string | null>(null);
  const [showNewTagDialog, setShowNewTagDialog] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const fetchObjectsWithRetry = async (ids: string[], maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const objects = await Promise.all(
          ids.map((id) => suiClient.getObject({ id, options: { showType: true } }))
        );
        const hasErrors = objects.some(obj => 'error' in obj);
        if (!hasErrors) {
          return objects;
        }
        await sleep(1000);
      } catch (error) {
        console.log(`Retry ${i + 1} failed:`, error);
        if (i === maxRetries - 1) throw error;
        await sleep(1000);
      }
    }
    throw new Error('Failed to fetch objects after maximum retries');
  };

  const handleCreateAllowlist = () => {
    setIsCreating(true);
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::tidal::create_allowlist_entry`,
      arguments: [tx.pure.u64(Number(fee)), tx.pure.string(name)],
    });
    tx.setGasBudget(10000000);
    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: async (result) => {
          setIsCreating(false);
          console.log('DEBUG allowlist creation result:', result);
          if (result.effects?.status?.status === 'success') {
            const createdIds = result.effects?.created?.map((item) => item.reference.objectId) || [];
            console.log('Created object IDs:', createdIds);
            try {
              const objects = await fetchObjectsWithRetry(createdIds);
              console.log('Fetched objects:', objects);
              let allowlist = null;
              let cap = null;
              for (const obj of objects) {
                if (!obj.data) continue;
                const type = obj.data.type;
                console.log('Object type:', type);
                if (type && type.includes('::tidal::Allowlist')) allowlist = obj.data.objectId;
                if (type && type.includes('::tidal::Cap')) cap = obj.data.objectId;
              }
              if (allowlist && cap) {
                console.log('Found allowlist:', allowlist, 'and cap:', cap);
                setAllowlistId(allowlist);
                setCapId(cap);
              } else {
                console.error('Failed to find allowlist or cap in created objects');
                alert('Failed to create allowlist or cap.');
              }
            } catch (error) {
              console.error('Error fetching objects:', error);
              alert('Error fetching created objects. Please try again.');
            }
          } else {
            console.error('Transaction failed:', result.effects?.status);
            alert('Transaction failed: ' + (result.effects?.status?.error || 'Unknown error'));
          }
        },
        onError: (error) => {
          console.error('Transaction error:', error);
          setIsCreating(false);
          alert('Transaction failed: ' + error.message);
        },
      }
    );
  };

  const handleBlobUploaded = (info: any) => {
    console.log('DEBUG: handleBlobUploaded called with', info);
    setUploadedBlobInfo(info);
    setPublishStatus('');
  };

  const handlePublish = async () => {
    if (!allowlistId || !capId || !uploadedBlobInfo?.blobId) {
      setPublishStatus('Missing required data.');
      return;
    }
    setPublishStatus('Publishing to Sui...');
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::tidal::publish`,
      arguments: [tx.object(allowlistId), tx.object(capId), tx.pure.string(uploadedBlobInfo.blobId)],
    });
    tx.setGasBudget(10000000);
    signAndExecute(
      { transaction: tx as any },
      {
        onSuccess: async (result) => {
          setPublishStatus('Successfully published to Sui! Adding to Supabase...');
          // Insert asset into Supabase
          try {
            const asset = {
              name,
              description,
              price: Number(fee),
              tags,
              file_url: uploadedBlobInfo.blobUrl,
              creator_address: account?.address || '',
              allowlist_id: allowlistId,
              walrus_blob_id: uploadedBlobInfo.blobId,
              sui_object_id: uploadedBlobInfo.suiRef,
              cap_id: capId,
              preview_gif_url: (window as any).__latestGifUrl || null,
            };
            await supabase.from('assets').insert([asset]);
            setPublishStatus('Asset published!');
            fetchAssets(); // Refresh asset list after publishing
          } catch (e: any) {
            setPublishStatus('Published to Sui, but failed to add to Supabase: ' + e.message);
          }
        },
        onError: (error) => {
          setPublishStatus('Failed to publish: ' + error.message);
          console.error('Publish error:', error);
        },
      }
    );
  };

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

  // Update fetchAssets to also fetch purchases
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
    if (initialAsset) {
      setAsset(initialAsset);
      setAssetId(initialAsset.id);
      setAllowlistId(initialAsset.allowlist_id);
      setEncryptedObjectId(initialAsset.encrypted_object_id);
    }
    // eslint-disable-next-line
  }, [page, filterName, filterTag, account?.address, initialAsset]);

  const sealClient = new SealClient({
    suiClient: suiClient as any,
    serverObjectIds: getAllowlistedKeyServers('testnet'),
    verifyKeyServers: false,
  });

  // Helper: check if user is in allowlist
  const isUserInAllowlist = (asset: any) => {
    if (!account?.address || !asset.allowlist_id || !Array.isArray(asset.allowlist_users)) return false;
    return asset.allowlist_users.includes(account.address);
  };

  // Helper: check if user has purchased asset
  const hasUserPurchased = (asset: any) => userPurchases.includes(asset.id);

  // Purchase logic
  const handlePurchase = async (asset: any) => {
    if (!account?.address) {
      alert('Please connect your wallet first');
      return;
    }
    setPurchaseStatus(s => ({ ...s, [asset.id]: 'Processing purchase...' }));
    try {
      // Fetch allowlist object to get users and fee
      console.log('Fetching allowlist object:', asset.allowlist_id);
      const allowlistObj = await suiClient.getObject({ id: asset.allowlist_id, options: { showContent: true } });
      console.log('Allowlist object:', allowlistObj);
      const fields = (allowlistObj.data?.content as { fields: any })?.fields || {};
      console.log('Allowlist fields:', fields);
      const fee = fields.fee || 0;
      console.log('Fee:', fee);
      const capId = asset.cap_id || asset.capId || asset.cap || '';
      console.log('Cap ID:', capId);
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
      console.log('Executing transaction...');
      await signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: async (result) => {
            console.log('Transaction result:', result);
            if (result.effects?.status?.status === 'success') {
              setPurchaseStatus(s => ({ ...s, [asset.id]: 'Purchase successful!' }));
              // Insert purchase record in Supabase
              await supabase.from('purchases').insert([
                { asset_id: asset.id, user_address: account.address }
              ]);
              fetchAssets(); // Refresh asset list and purchases
            } else {
              console.error('Transaction failed:', result.effects?.status);
              setPurchaseStatus(s => ({ ...s, [asset.id]: 'Purchase failed: ' + (result.effects?.status?.error || 'Unknown error') }));
            }
          },
          onError: (error) => {
            console.error('Transaction error:', error);
            setPurchaseStatus(s => ({ ...s, [asset.id]: 'Purchase failed: ' + error.message }));
          },
        }
      );
    } catch (e: any) {
      console.error('Purchase error:', e);
      setPurchaseStatus(s => ({ ...s, [asset.id]: 'Purchase failed: ' + e.message }));
    }
  };

  const fetchObjectWithRetry = async (id: string, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const obj = await suiClient.getObject({
          id,
          options: { showContent: true }
        });
        if (obj.data) {
          return obj;
        }
        await sleep(1000);
      } catch (error) {
        console.log(`Retry ${i + 1} failed:`, error);
        if (i === maxRetries - 1) throw error;
        await sleep(1000);
      }
    }
    throw new Error('Failed to fetch object after maximum retries');
  };

  const constructMoveCall = (packageId: string, allowlistId: string) => {
    return (tx: Transaction, id: string) => {
      tx.moveCall({
        target: `${packageId}::tidal::seal_approve`,
        arguments: [
          tx.pure.vector('u8', fromHex(id)),
          tx.object(allowlistId),
        ],
      });
    };
  };

  // Download logic
  const handleDownload = async (asset: any) => {
    if (!account?.address) {
      alert('Please connect your wallet first');
      return;
    }
    setDownloading(s => ({ ...s, [asset.id]: true }));
    setDownloadStatus(s => ({ ...s, [asset.id]: 'Decrypting and downloading...' }));
    try {
      if (!packageId) throw new Error('No package ID configured');

      // Check if we have a valid session key
      if (
        currentSessionKey &&
        !currentSessionKey.isExpired() &&
        currentSessionKey.getAddress() === account.address
      ) {
        // Use existing session key
        await handleDecrypt(asset, currentSessionKey);
        return;
      }

      // Create new session key
      const sessionKey = new SessionKey({
        address: account.address,
        packageId,
        ttlMin: 10,
      });

      // Get personal message signature
      signPersonalMessage(
        { message: sessionKey.getPersonalMessage() },
        {
          onSuccess: async (result) => {
            try {
              await sessionKey.setPersonalMessageSignature(result.signature);
              await handleDecrypt(asset, sessionKey);
              setCurrentSessionKey(sessionKey);
            } catch (e: any) {
              console.error('Decryption error:', e);
              setDownloadStatus(s => ({ ...s, [asset.id]: 'Download failed: ' + e.message }));
            }
          },
          onError: (error) => {
            console.error('Signature error:', error);
            setDownloadStatus(s => ({ ...s, [asset.id]: 'Failed to sign message: ' + error.message }));
          },
        },
      );
    } catch (e: any) {
      console.error('Download error:', e);
      setDownloadStatus(s => ({ ...s, [asset.id]: 'Download failed: ' + e.message }));
    } finally {
      setDownloading(s => ({ ...s, [asset.id]: false }));
    }
  };

  const handleDecrypt = async (asset: any, sessionKey: SessionKey) => {
    try {
      // Check if user is in allowlist
      console.log('Checking allowlist:', asset.allowlist_id);
      const allowlistObj = await suiClient.getObject({
        id: asset.allowlist_id,
        options: { showContent: true }
      });
      console.log('Allowlist object:', allowlistObj);
      const fields = (allowlistObj.data?.content as { fields: any })?.fields || {};
      console.log('Allowlist fields:', fields);
      const allowlist = fields.list || [];
      console.log('Allowlist members:', allowlist);
      console.log('User address:', account?.address);
      if (!allowlist.includes(account?.address)) {
        throw new Error('You are not in the allowlist for this asset');
      }

      // Download encrypted blob
      const response = await fetch(asset.file_url);
      if (!response.ok) throw new Error('Failed to fetch encrypted file');
      const encryptedData = new Uint8Array(await response.arrayBuffer());

      // Get the ID from the encrypted data
      const encryptedObject = EncryptedObject.parse(encryptedData);
      const id = encryptedObject.id;
      console.log('Encrypted object ID:', id);

      // First fetch the keys
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::tidal::seal_approve`,
        arguments: [
          tx.pure.vector('u8', fromHex(id)),
          tx.object(asset.allowlist_id),
        ],
      });
      tx.setSender(account?.address!);
      tx.setGasBudget(10000000);
      const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

      try {
        // Fetch keys first
        await sealClient.fetchKeys({
          ids: [id],
          txBytes,
          sessionKey,
          threshold: 2
        });

        // Then decrypt
        const decrypted = await sealClient.decrypt({
          sessionKey,
          data: encryptedData,
          txBytes,
        });

        // Create and download file
        const blob = new Blob([decrypted], { type: 'model/gltf+json' });
        let filename = (asset.name ? asset.name.replace(/\s+/g, '_') : 'decrypted_file') + '.gltf';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setDownloadStatus(s => ({ ...s, [asset.id]: 'Download complete!' }));
      } catch (err) {
        console.error('Decryption error:', err);
        const errorMsg = err instanceof NoAccessError
          ? 'No access to decryption keys'
          : 'Unable to decrypt files, try again';
        setDownloadStatus(s => ({ ...s, [asset.id]: errorMsg }));
        throw err;
      }
    } catch (e: any) {
      console.error('Download error:', e);
      setDownloadStatus(s => ({ ...s, [asset.id]: 'Download failed: ' + e.message }));
      throw e;
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

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  const handleAddTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddNewTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      handleAddTag(newTagInput.trim());
      setNewTagInput('');
      setShowNewTagDialog(false);
    }
  };

  return (
    <Box p="4">
      <Card>
        <Flex direction="column" gap="4">
          {!asset && (
            <>

              <label htmlFor="asset-name">Asset Name</label>
              <input
                id="asset-name"
                className="radix-themes"
                placeholder="Asset Name"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              />

              <label htmlFor="asset-description">Description</label>
              <input
                id="asset-description"
                className="radix-themes"
                placeholder="Description"
                value={description}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
              />

              <label htmlFor="asset-tags">Tags</label>
              <Flex direction="column" gap="2">
                <Flex gap="2" wrap="wrap">
                  {tags.map((tag) => (
                    <Button
                      key={tag}
                      size="1"
                      variant="soft"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Button>
                  ))}
                </Flex>
                <Flex gap="2">
                  <Select.Root
                    value={newTag}
                    onValueChange={(value) => {
                      if (value === 'new') {
                        setShowNewTagDialog(true);
                      } else {
                        handleAddTag(value);
                      }
                    }}
                  >
                    <Select.Trigger placeholder="Select or add tag" />
                    <Select.Content position="popper" sideOffset={5}>
                      <Select.Item value="new">+ Add New Tag</Select.Item>
                      {availableTags
                        .filter(tag => !tags.includes(tag))
                        .map(tag => (
                          <Select.Item key={tag} value={tag}>
                            {tag}
                          </Select.Item>
                        ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>
              </Flex>

              <Dialog.Root open={showNewTagDialog} onOpenChange={setShowNewTagDialog}>
                <Dialog.Content style={{ maxWidth: 450 }}>
                  <Dialog.Title>Add New Tag</Dialog.Title>
                  <Dialog.Description size="2" mb="4">
                    Enter a new tag name
                  </Dialog.Description>

                  <Flex direction="column" gap="3">
                    <input
                      className="radix-themes"
                      placeholder="Enter tag name"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNewTag();
                        }
                      }}
                    />

                    <Flex gap="3" mt="4" justify="end">
                      <Dialog.Close>
                        <Button variant="soft" color="gray">
                          Cancel
                        </Button>
                      </Dialog.Close>
                      <Button onClick={handleAddNewTag}>
                        Add Tag
                      </Button>
                    </Flex>
                  </Flex>
                </Dialog.Content>
              </Dialog.Root>

              <label htmlFor="asset-fee">Price (in MIST, smallest SUI denomination)</label>
              <input
                id="asset-fee"
                className="radix-themes"
                placeholder="Price (in MIST)"
                type="number"
                step="1"
                min="0"
                value={fee}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  // Only allow integers, remove leading zeros and handle empty input
                  setFee(value === '' ? '' : String(Math.floor(Number(value))));
                }}
              />

              <Button
                style={{ transform: 'none' }}
                disabled={isCreating || !name || !fee}
                onClick={handleCreateAllowlist}
              >
                {isCreating ? 'Creating...' : 'Create Access List'}
              </Button>

              {allowlistId && capId && (
                <WalrusUpload
                  policyObject={allowlistId.startsWith('0x') ? allowlistId : `0x${allowlistId}`}
                  cap_id={capId}
                  onBlobUploaded={handleBlobUploaded}
                />
              )}

              {uploadedBlobInfo && (
                <Button onClick={handlePublish}>
                  {publishStatus || 'Publish to Tidal Marketplace'}
                </Button>
              )}
            </>
          )}

          {asset && (
            <>
              <Text size="5" weight="bold">Asset Details</Text>
              <Text>Name: {asset.name}</Text>
              <Text>Description: {asset.description}</Text>
              <Text>Price: {asset.price}</Text>
              <Text>Tags: {asset.tags.join(', ')}</Text>
              {onClose && (
                <Button onClick={onClose} variant="outline">
                  Close
                </Button>
              )}
            </>
          )}
        </Flex>
      </Card>

      {showAssetList && !initialAsset && !asset && (
        <Box mt="4">
          <Card>
            <Flex direction="column" gap="4">
              <Text size="5" weight="bold">Asset List</Text>

              <input
                className="radix-themes"
                placeholder="Filter by name"
                value={filterName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFilterName(e.target.value)}
              />

              <input
                className="radix-themes"
                placeholder="Filter by tag"
                value={filterTag}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFilterTag(e.target.value)}
              />

              {assetError && (
                <Text color="red">{assetError}</Text>
              )}

              {assetLoading ? (
                <Text>Loading assets...</Text>
              ) : (
                <Flex direction="column" gap="2">
                  {assetList.map((asset) => {
                    console.log('[AssetList DEBUG]', asset);
                    return (
                      <Card key={asset.id}>
                        <Flex direction="column" gap="2">
                          <Flex direction="row" gap="2" align="center">
                            {asset.preview_gif_url && (
                              <img src={asset.preview_gif_url} alt="Preview GIF" style={{ width: 64, height: 64, border: '1px solid #ccc', marginRight: 8 }} />
                            )}
                            <Text weight="bold">{asset.name}</Text>
                          </Flex>
                          <Text>{asset.description}</Text>
                          <Text>Price: {asset.price}</Text>
                          <Text>Tags: {asset.tags.join(', ')}</Text>
                          {hasUserPurchased(asset) ? (
                            <Button
                              disabled={downloading[asset.id]}
                              onClick={() => handleDownload(asset)}
                            >
                              {downloadStatus[asset.id] || 'Download'}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handlePurchase(asset)}
                            >
                              {purchaseStatus[asset.id] || 'Purchase'}
                            </Button>
                          )}
                        </Flex>
                      </Card>
                    );
                  })}

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
      )}
    </Box>
  );
} 