// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import React, { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useNetworkVariable } from './networkConfig';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Button, Card, Flex, Spinner, Text } from '@radix-ui/themes';
import { getAllowlistedKeyServers, SealClient } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import { createHash } from 'crypto';
import { generate360Gif } from './utils/generate360Gif';
import { supabase } from './utils/supabase';

export type Data = {
  status: string;
  blobId: string;
  endEpoch: string;
  suiRefType: string;
  suiRef: string;
  suiBaseUrl: string;
  blobUrl: string;
  suiUrl: string;
  isImage: boolean;
};

interface WalrusUploadProps {
  policyObject?: string;
  cap_id?: string;
  moduleName?: string;
  onBlobUploaded?: (info: Data) => void;
}

type WalrusService = {
  id: string;
  name: string;
  publisherUrl: string;
  aggregatorUrl: string;
};

export function WalrusUpload({ policyObject, cap_id, moduleName, onBlobUploaded }: WalrusUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<Data | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('service1');
  const [fileError, setFileError] = useState<string | null>(null);
  const [gifPreviewUrl, setGifPreviewUrl] = useState<string | null>(null);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifUploadStatus, setGifUploadStatus] = useState<string | null>(null);

  // Set a default policyObject if not provided
  const safePolicyObject = policyObject ?? '00000000000000000000000000000000';

  const SUI_VIEW_TX_URL = `https://suiscan.xyz/testnet/tx`;
  const SUI_VIEW_OBJECT_URL = `https://suiscan.xyz/testnet/object`;

  const NUM_EPOCH = 1;
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  const client = new SealClient({
    suiClient,
    serverObjectIds: getAllowlistedKeyServers('testnet'),
    verifyKeyServers: false,
  });

  const services: WalrusService[] = [
    {
      id: 'service1',
      name: 'walrus.space',
      publisherUrl: '/publisher1',
      aggregatorUrl: '/aggregator1',
    },
    {
      id: 'service2',
      name: 'staketab.org',
      publisherUrl: '/publisher2',
      aggregatorUrl: '/aggregator2',
    },
    {
      id: 'service3',
      name: 'redundex.com',
      publisherUrl: '/publisher3',
      aggregatorUrl: '/aggregator3',
    },
    {
      id: 'service4',
      name: 'nodes.guru',
      publisherUrl: '/publisher4',
      aggregatorUrl: '/aggregator4',
    },
    {
      id: 'service5',
      name: 'banansen.dev',
      publisherUrl: '/publisher5',
      aggregatorUrl: '/aggregator5',
    },
    {
      id: 'service6',
      name: 'everstake.one',
      publisherUrl: '/publisher6',
      aggregatorUrl: '/aggregator6',
    },
  ];

  function getAggregatorUrl(path: string): string {
    const service = services.find((s) => s.id === selectedService);
    const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
    return `${service?.aggregatorUrl}/v1/${cleanPath}`;
  }

  function getPublisherUrl(path: string): string {
    const service = services.find((s) => s.id === selectedService);
    const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
    return `${service?.publisherUrl}/v1/${cleanPath}`;
  }

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

  const handleFileChange = async (event: any) => {
    const file = event.target.files[0];
    setFileError(null);
    setFile(null);
    setInfo(null);
    setGifPreviewUrl(null);
    setGifBlob(null);
    if (!file) return;
    // Max 10 MiB size
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size must be less than 10 MiB');
      return;
    }
    // Allow .glb or .gltf extension (case-insensitive)
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setFileError('Only .glb or .gltf 3D model files are allowed');
      return;
    }
    setFile(file);
    // Generate GIF preview
    try {
      const gif = await generate360Gif(file);
      setGifBlob(gif);
      setGifPreviewUrl(URL.createObjectURL(gif));
    } catch (err) {
      setFileError('Failed to generate GIF preview: ' + (err as Error).message);
    }
  };

  const getFileHashHex = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async () => {
    setIsUploading(true);
    if (file) {
      const reader = new FileReader();
      reader.onload = async function (event) {
        if (event.target && event.target.result) {
          const result = event.target.result;
          if (result instanceof ArrayBuffer) {
            const nonce = crypto.getRandomValues(new Uint8Array(5));
            if (!policyObject || typeof policyObject !== 'string' || !policyObject.startsWith('0x')) {
              throw new Error('Invalid policyObject: must be a string starting with 0x (allowlist object ID)');
            }
            const policyObjectBytes = fromHex(policyObject);
            const id = toHex(new Uint8Array([...policyObjectBytes, ...nonce]));
            const encryptOptions: any = {
              data: new Uint8Array(result),
              id,
              threshold: 2,
              packageId,
            };
            const { encryptedObject: encryptedBytes } = await client.encrypt(encryptOptions);
            const storageInfo = await storeBlob(encryptedBytes);
            console.log('DEBUG file:', file, 'file.type:', file?.type);
            displayUpload(storageInfo.info, typeof file?.type === 'string' ? file.type : '');
            // Upload GIF preview to Supabase Storage
            if (gifBlob) {
              setGifUploadStatus('Uploading GIF preview...');
              const gifPath = `previews/${Date.now()}_${file.name.replace(/\.[^/.]+$/, '')}.gif`;
              const { error } = await supabase.storage.from('assets').upload(gifPath, gifBlob, { contentType: 'image/gif' });
              if (error) {
                setGifUploadStatus('Failed to upload GIF preview: ' + error.message);
              } else {
                const { data } = supabase.storage.from('assets').getPublicUrl(gifPath);
                setGifUploadStatus('GIF preview uploaded!');
                // Store the GIF URL for later asset creation
                (window as any).__latestGifUrl = data.publicUrl;
              }
            }
            setIsUploading(false);
          } else {
            console.error('Unexpected result type:', typeof result);
            setIsUploading(false);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      console.error('No file selected');
    }
  };

  const displayUpload = (storage_info: any, media_type: string = '') => {
    let info;
    if ('alreadyCertified' in storage_info) {
      info = {
        status: 'Already certified',
        blobId: storage_info.alreadyCertified.blobId,
        endEpoch: storage_info.alreadyCertified.endEpoch,
        suiRefType: 'Previous Sui Certified Event',
        suiRef: storage_info.alreadyCertified.event.txDigest,
        suiBaseUrl: SUI_VIEW_TX_URL,
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.alreadyCertified.blobId}`),
        suiUrl: `${SUI_VIEW_OBJECT_URL}/${storage_info.alreadyCertified.event.txDigest}`,
        isImage: typeof media_type === 'string' && media_type.startsWith('image'),
      };
    } else if ('newlyCreated' in storage_info) {
      info = {
        status: 'Newly created',
        blobId: storage_info.newlyCreated.blobObject.blobId,
        endEpoch: storage_info.newlyCreated.blobObject.storage.endEpoch,
        suiRefType: 'Associated Sui Object',
        suiRef: storage_info.newlyCreated.blobObject.id,
        suiBaseUrl: SUI_VIEW_OBJECT_URL,
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.newlyCreated.blobObject.blobId}`),
        suiUrl: `${SUI_VIEW_OBJECT_URL}/${storage_info.newlyCreated.blobObject.id}`,
        isImage: typeof media_type === 'string' && media_type.startsWith('image'),
      };
    } else {
      throw Error('Unhandled successful response!');
    }
    setInfo(info);
    if (onBlobUploaded) onBlobUploaded(info);
  };

  const storeBlob = (encryptedData: Uint8Array) => {
    return fetch(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`)}`, {
      method: 'PUT',
      body: encryptedData,
    }).then((response) => {
      if (response.status === 200) {
        return response.json().then((info) => {
          return { info };
        });
      } else {
        alert('Error publishing the blob on Walrus, please select a different Walrus service.');
        setIsUploading(false);
        throw new Error('Something went wrong when storing the blob!');
      }
    });
  };

  return (
    <Card>
      <Flex direction="column" gap="2" align="start">
        <Flex gap="2" align="center">
          <Text>Select Walrus service:</Text>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            aria-label="Select Walrus service"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </Flex>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
          aria-label="Choose .glb or .gltf file to upload"
        />
        {gifPreviewUrl && (
          <div>
            <p>360° Preview:</p>
            <img src={gifPreviewUrl} alt="360 preview gif" style={{ width: 128, height: 128, border: '1px solid #ccc' }} />
          </div>
        )}
        {fileError && <Text color="red">{fileError}</Text>}
        <p>File size must be less than 10 MiB. Only .glb or .gltf 3D model files are allowed.</p>
        <Button
          onClick={() => {
            handleSubmit();
          }}
          disabled={file === null}
        >
          First step: Encrypt and upload to Walrus
        </Button>
        {isUploading && (
          <div role="status">
            <Spinner className="animate-spin" aria-label="Uploading" />
            <span>
              Uploading to Walrus (may take a few seconds, retrying with different service is
              possible){' '}
            </span>
          </div>
        )}

        {gifUploadStatus && <Text>{gifUploadStatus}</Text>}

        {info && file && (
          <div id="uploaded-blobs" role="region" aria-label="Upload details">
            <dl>
              <dt>Status:</dt>
              <dd>{info.status}</dd>
              <dd>
                <a
                  href={info.blobUrl}
                  style={{ textDecoration: 'underline' }}
                  download
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(info.blobUrl, '_blank', 'noopener,noreferrer');
                  }}
                  aria-label="Download encrypted blob"
                >
                  Encrypted blob
                </a>
              </dd>
              <dd>
                <a
                  href={info.suiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                  aria-label="View Sui object details"
                >
                  Sui Object
                </a>
              </dd>
            </dl>
          </div>
        )}
      </Flex>
    </Card>
  );
}

export default WalrusUpload;
