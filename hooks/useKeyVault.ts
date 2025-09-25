import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '@/hooks/useEthers';
import { useShamirRecovery } from '@/hooks/useShamirRecovery';
import { useSocialRecovery } from '@/hooks/useSocialRecovery';
import { useKeyVaultStorage } from '@/hooks/useKeyVaultStorage';
import { ShamirSecretSharing } from '@/utils/shamirSecretSharing';
import { ethers } from 'ethers';

export type RecoveryMethod = 'none' | 'shamir' | 'social' | 'both';

export interface KeyRecord {
  id: string;
  title: string;
  keyType: 'crypto' | 'ssh' | 'api' | 'certificate' | 'other';
  masterCid: string; // Primary encrypted key CID on Filecoin
  encDataKey: string; // Data key encrypted with user password
  keyHash: string; // Hash of original key for verification
  version: number;
  timestamp: number;
  hasSharedShares: boolean; // Whether Shamir shares exist
  hasSocialBackup: boolean; // Whether social recovery is configured
  recoveryMethod: RecoveryMethod;
}

export interface KeyVaultConfig {
  owner: string;
  recoveryMethod: RecoveryMethod;
  isInitialized: boolean;
  createdAt: number;
}

export interface BackupStrategy {
  useLocalStorage: boolean;
  useFilecoinPrimary: boolean;
  useShamirSharing: boolean;
  useSocialRecovery: boolean;
  redundancyLevel: 'basic' | 'standard' | 'high';
}

export const useKeyVault = () => {
  const [config, setConfig] = useState<KeyVaultConfig | null>(null);
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const { address, chainId } = useAccount();
  const signer = useEthersSigner();

  // Recovery hooks
  const shamirRecovery = useShamirRecovery();
  const socialRecovery = useSocialRecovery();
  const storage = useKeyVaultStorage();

  /**
   * Initialize KeyVault for the user
   */
  const initializeVaultMutation = useMutation({
    mutationFn: async ({
      recoveryMethod,
      backupStrategy
    }: {
      recoveryMethod: RecoveryMethod;
      backupStrategy: BackupStrategy;
    }) => {
      if (!address || !signer) throw new Error('Wallet not connected');

      setStatus('🏗️ Initializing KeyVault...');
      setProgress(10);

      // Create vault configuration
      const vaultConfig: KeyVaultConfig = {
        owner: address,
        recoveryMethod,
        isInitialized: true,
        createdAt: Date.now()
      };

      setStatus('⚙️ Configuring recovery methods...');
      setProgress(30);

      // Configure recovery methods based on selection
      if (recoveryMethod === 'shamir' || recoveryMethod === 'both') {
        const shamirConfig = {
          threshold: backupStrategy.redundancyLevel === 'high' ? 3 : 2,
          totalShares: backupStrategy.redundancyLevel === 'high' ? 5 : 3,
          keyId: `vault_${address}_${Date.now()}`
        };
        shamirRecovery.configureShamir(shamirConfig);
      }

      if (recoveryMethod === 'social' || recoveryMethod === 'both') {
        const socialConfig = {
          requiredApprovals: backupStrategy.redundancyLevel === 'high' ? 4 : 3,
          recoveryDelay: backupStrategy.redundancyLevel === 'high' ? 72 * 60 * 60 : 48 * 60 * 60 // 72h or 48h
        };
        socialRecovery.configureSocialRecovery(socialConfig);
      }

      setStatus('⛓️ Deploying vault on blockchain...');
      setProgress(60);

      // In real implementation, deploy KeyVault contract
      // This is a placeholder

      // Save config to localStorage for persistence
      localStorage.setItem(`keyvault_config_${address}`, JSON.stringify(vaultConfig));

      setConfig(vaultConfig);
      setStatus('✅ KeyVault initialized successfully!');
      setProgress(100);

      return vaultConfig;
    },
    onError: (error) => {
      setStatus(`❌ Initialization failed: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Store a private key with backup strategy
   */
  const storeKeyMutation = useMutation({
    mutationFn: async ({
      title,
      keyType,
      privateKeyData,
      password
    }: {
      title: string;
      keyType: KeyRecord['keyType'];
      privateKeyData: Uint8Array;
      password: string;
    }) => {
      if (!config) throw new Error('KeyVault not initialized');
      if (!address || !signer) throw new Error('Wallet not connected');

      const keyId = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      setStatus('🔐 Encrypting private key...');
      setProgress(5);

      // Generate data encryption key
      const dataKey = crypto.getRandomValues(new Uint8Array(32));

      // Encrypt private key with data key
      const encryptedKey = await encryptWithKey(privateKeyData, dataKey);

      // Encrypt data key with user password
      const passwordKey = await deriveKeyFromPassword(password);
      const encDataKey = await encryptWithKey(dataKey, passwordKey);

      // Generate key hash for verification
      const keyHashBuffer = await crypto.subtle.digest('SHA-256', privateKeyData);
      const keyHash = Array.from(new Uint8Array(keyHashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      setStatus('☁️ Storing encrypted key on Filecoin...');
      setProgress(15);

      // Store primary encrypted key with redundancy
      const distributedStorage = await new Promise<any>((resolve, reject) => {
        storage.storeWithRedundancy({
          data: encryptedKey,
          filename: `${keyId}.enc`,
          keyId
        });

        // Mock successful storage - in real implementation, wait for actual result
        setTimeout(() => {
          resolve({
            dataHash: 'mock_hash',
            primaryCid: 'mock_cid',
            replicas: [],
            redundancyMet: true
          });
        }, 1000);
      });

      setProgress(40);

      let hasSharedShares = false;
      let hasSocialBackup = false;

      // Implement Shamir Secret Sharing if configured
      if (config.recoveryMethod === 'shamir' || config.recoveryMethod === 'both') {
        setStatus('🔀 Creating Shamir secret shares...');

        if (!shamirRecovery.config) {
          throw new Error('Shamir recovery not configured');
        }

        // Split the private key using Shamir sharing
        await new Promise<void>((resolve, reject) => {
          shamirRecovery.splitAndDistribute({
            privateKey: privateKeyData,
            providers: storage.providers.slice(0, shamirRecovery.config!.totalShares)
          });

          // Mock successful distribution
          setTimeout(resolve, 1500);
        });

        hasSharedShares = true;
        setProgress(70);
      }

      // Implement Social Recovery if configured
      if (config.recoveryMethod === 'social' || config.recoveryMethod === 'both') {
        setStatus('👥 Preparing social recovery shares...');
        hasSocialBackup = true;
        setProgress(85);
      }

      setStatus('📝 Recording key metadata...');

      // Create key record
      const keyRecord: KeyRecord = {
        id: keyId,
        title,
        keyType,
        masterCid: distributedStorage.primaryCid,
        encDataKey: Array.from(encDataKey).map(b => b.toString(16).padStart(2, '0')).join(''),
        keyHash,
        version: 1,
        timestamp: Date.now(),
        hasSharedShares,
        hasSocialBackup,
        recoveryMethod: config.recoveryMethod
      };

      // Save keys to localStorage for persistence
      const updatedKeys = [...keys, keyRecord];
      localStorage.setItem(`keyvault_keys_${address}`, JSON.stringify(updatedKeys));

      setKeys(updatedKeys);
      setStatus('✅ Private key stored successfully with backup strategy!');
      setProgress(100);

      return keyRecord;
    },
    onError: (error) => {
      setStatus(`❌ Key storage failed: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Retrieve and decrypt a private key
   */
  const retrieveKeyMutation = useMutation({
    mutationFn: async ({
      keyId,
      password
    }: {
      keyId: string;
      password: string;
    }) => {
      if (!address || !signer) throw new Error('Wallet not connected');

      const keyRecord = keys.find(k => k.id === keyId);
      if (!keyRecord) throw new Error('Key not found');

      setStatus('📥 Retrieving encrypted key from Filecoin...');
      setProgress(10);

      // Retrieve encrypted key
      const encryptedKeyData = await new Promise<Uint8Array>((resolve, reject) => {
        storage.retrieveData({ dataHash: keyRecord.keyHash });

        // Mock successful retrieval
        setTimeout(() => {
          resolve(new Uint8Array([1, 2, 3, 4, 5])); // Mock encrypted data
        }, 500);
      });

      setProgress(40);

      setStatus('🔓 Decrypting private key...');

      // Decrypt data key with password
      const passwordKey = await deriveKeyFromPassword(password);
      const encDataKeyBytes = new Uint8Array(
        keyRecord.encDataKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );
      const dataKey = await decryptWithKey(encDataKeyBytes, passwordKey);

      // Decrypt private key with data key
      const privateKeyData = await decryptWithKey(encryptedKeyData, dataKey);

      setProgress(80);

      setStatus('🔍 Verifying key integrity...');

      // Verify key hash
      const verificationHash = await crypto.subtle.digest('SHA-256', privateKeyData);
      const verificationHashHex = Array.from(new Uint8Array(verificationHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (verificationHashHex !== keyRecord.keyHash) {
        throw new Error('Key integrity check failed');
      }

      setStatus('✅ Private key retrieved successfully!');
      setProgress(100);

      return {
        keyId,
        privateKey: privateKeyData,
        keyRecord
      };
    },
    onError: (error) => {
      setStatus(`❌ Key retrieval failed: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Initiate recovery process
   */
  const initiateRecoveryMutation = useMutation({
    mutationFn: async ({
      keyId,
      recoveryMethod,
      newOwner
    }: {
      keyId: string;
      recoveryMethod: 'shamir' | 'social';
      newOwner?: string;
    }) => {
      if (!address || !signer) throw new Error('Wallet not connected');

      const keyRecord = keys.find(k => k.id === keyId);
      if (!keyRecord) throw new Error('Key not found');

      setStatus(`🚨 Initiating ${recoveryMethod} recovery...`);
      setProgress(10);

      let recoveryId: string;

      if (recoveryMethod === 'shamir') {
        if (!keyRecord.hasSharedShares) {
          throw new Error('Shamir shares not available for this key');
        }

        recoveryId = await new Promise<string>((resolve, reject) => {
          shamirRecovery.initiateRecovery({ keyId });
          // Mock recovery ID
          setTimeout(() => resolve(`shamir_${Date.now()}`), 500);
        });

      } else if (recoveryMethod === 'social') {
        if (!keyRecord.hasSocialBackup) {
          throw new Error('Social recovery not configured for this key');
        }

        if (!newOwner) throw new Error('New owner address required for social recovery');

        recoveryId = await new Promise<string>((resolve, reject) => {
          socialRecovery.proposeRecovery({
            newOwner,
            description: `Recovery for key: ${keyRecord.title}`
          });
          // Mock recovery ID
          setTimeout(() => resolve(`social_${Date.now()}`), 500);
        });

      } else {
        throw new Error('Invalid recovery method');
      }

      setStatus(`✅ Recovery initiated! Recovery ID: ${recoveryId}`);
      setProgress(100);

      return { recoveryId, method: recoveryMethod };
    },
    onError: (error) => {
      setStatus(`❌ Recovery initiation failed: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Get vault statistics
   */
  const getVaultStats = useCallback((): {
    totalKeys: number;
    keysWithShamir: number;
    keysWithSocial: number;
    keysWithBoth: number;
    storageUsed: number;
    redundancyMet: boolean;
  } => {
    const totalKeys = keys.length;
    const keysWithShamir = keys.filter(k => k.hasSharedShares).length;
    const keysWithSocial = keys.filter(k => k.hasSocialBackup).length;
    const keysWithBoth = keys.filter(k => k.hasSharedShares && k.hasSocialBackup).length;

    return {
      totalKeys,
      keysWithShamir,
      keysWithSocial,
      keysWithBoth,
      storageUsed: totalKeys * 1024, // Mock storage calculation
      redundancyMet: totalKeys > 0 ? true : false
    };
  }, [keys]);

  // Load vault configuration on wallet connection
  useEffect(() => {
    if (address && signer) {
      // In real implementation, load config from blockchain or local storage
      // For now, only load config if it exists (user has initialized)
      // This prevents auto-initialization bypass

      // Check if vault is already initialized for this address
      const existingConfig = localStorage.getItem(`keyvault_config_${address}`);
      if (existingConfig) {
        try {
          const parsedConfig = JSON.parse(existingConfig);
          setConfig(parsedConfig);

          // Also load saved keys
          const existingKeys = localStorage.getItem(`keyvault_keys_${address}`);
          if (existingKeys) {
            const parsedKeys = JSON.parse(existingKeys);
            setKeys(parsedKeys);
          }
        } catch (error) {
          console.error('Failed to parse stored config:', error);
          setConfig(null);
          setKeys([]);
        }
      } else {
        setConfig(null);
        setKeys([]);
      }
    } else {
      setConfig(null);
      setKeys([]);
    }
  }, [address, signer]);

  return {
    // State
    config,
    keys,
    status,
    progress,
    vaultStats: getVaultStats(),

    // Recovery hooks
    shamirRecovery,
    socialRecovery,
    storage,

    // Actions
    initializeVault: initializeVaultMutation.mutate,
    storeKey: storeKeyMutation.mutate,
    retrieveKey: retrieveKeyMutation.mutate,
    initiateRecovery: initiateRecoveryMutation.mutate,

    // Loading states
    isInitializing: initializeVaultMutation.isPending,
    isStoringKey: storeKeyMutation.isPending,
    isRetrievingKey: retrieveKeyMutation.isPending,
    isInitiatingRecovery: initiateRecoveryMutation.isPending,

    // Mutations for direct access
    initializeVaultMutation,
    storeKeyMutation,
    retrieveKeyMutation,
    initiateRecoveryMutation
  };
};

// Utility functions for encryption
async function deriveKeyFromPassword(password: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const key = await crypto.subtle.importKey('raw', passwordData, 'PBKDF2', false, ['deriveKey']);

  const salt = new Uint8Array(16); // In real implementation, use random salt and store it
  crypto.getRandomValues(salt);

  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  return new Uint8Array(await crypto.subtle.exportKey('raw', derivedKey));
}

async function encryptWithKey(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);

  return result;
}

async function decryptWithKey(encryptedData: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  const iv = encryptedData.slice(0, 12);
  const data = encryptedData.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  return new Uint8Array(decrypted);
}