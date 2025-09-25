import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '@/hooks/useEthers';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Synapse } from '@filoz/synapse-sdk';
import { config } from '@/config';

export interface StorageProvider {
  id: number;
  address: string;
  name: string;
  reputation: number;
  dealCount: number;
  isActive: boolean;
  registeredAt: number;
  location?: string;
  storagePrice?: bigint;
}

export interface StorageDeal {
  id: string;
  owner: string;
  provider: StorageProvider;
  dataCid: string;
  dealId: number;
  startEpoch: number;
  endEpoch: number;
  storagePrice: bigint;
  dataHash: string;
  status: 'pending' | 'active' | 'expired' | 'failed' | 'renewed';
  createdAt: number;
}

export interface RedundancyConfig {
  minReplicas: number;
  maxReplicas: number;
  renewalWindow: number; // seconds before expiry to renew
}

export interface DistributedStorage {
  dataHash: string;
  replicas: StorageDeal[];
  redundancyMet: boolean;
  primaryCid: string;
}

export const useKeyVaultStorage = () => {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [redundancyConfig, setRedundancyConfig] = useState<RedundancyConfig>({
    minReplicas: 3,
    maxReplicas: 5,
    renewalWindow: 7 * 24 * 60 * 60 // 1 week
  });

  const { address } = useAccount();
  const signer = useEthersSigner();
  const { uploadFileMutation } = useFileUpload();

  /**
   * Get available storage providers from registry
   */
  const providersQuery = useQuery({
    queryKey: ['storage-providers', address],
    queryFn: async (): Promise<StorageProvider[]> => {
      if (!signer) throw new Error('Signer not available');

      // In real implementation, this would query the StorageRegistry contract
      // For now, return mock data based on your existing provider structure
      return [
        {
          id: 1,
          address: '0x1234567890123456789012345678901234567890',
          name: 'Filecoin Provider A',
          reputation: 95,
          dealCount: 1250,
          isActive: true,
          registeredAt: Date.now() - 86400000, // 1 day ago
          location: 'US-East',
          storagePrice: BigInt('1000000000000000') // 0.001 USDFC per epoch
        },
        {
          id: 2,
          address: '0x2345678901234567890123456789012345678901',
          name: 'Filecoin Provider B',
          reputation: 88,
          dealCount: 980,
          isActive: true,
          registeredAt: Date.now() - 172800000, // 2 days ago
          location: 'EU-West',
          storagePrice: BigInt('1200000000000000') // 0.0012 USDFC per epoch
        },
        {
          id: 3,
          address: '0x3456789012345678901234567890123456789012',
          name: 'Filecoin Provider C',
          reputation: 92,
          dealCount: 1100,
          isActive: true,
          registeredAt: Date.now() - 259200000, // 3 days ago
          location: 'Asia-Pacific',
          storagePrice: BigInt('900000000000000') // 0.0009 USDFC per epoch
        },
        {
          id: 4,
          address: '0x4567890123456789012345678901234567890123',
          name: 'Filecoin Provider D',
          reputation: 87,
          dealCount: 750,
          isActive: true,
          registeredAt: Date.now() - 345600000, // 4 days ago
          location: 'US-West',
          storagePrice: BigInt('1100000000000000') // 0.0011 USDFC per epoch
        },
        {
          id: 5,
          address: '0x5678901234567890123456789012345678901234',
          name: 'Filecoin Provider E',
          reputation: 90,
          dealCount: 1450,
          isActive: true,
          registeredAt: Date.now() - 432000000, // 5 days ago
          location: 'EU-Central',
          storagePrice: BigInt('950000000000000') // 0.00095 USDFC per epoch
        }
      ];
    },
    enabled: !!signer,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Select optimal providers for redundant storage
   */
  const selectOptimalProviders = useCallback((
    providers: StorageProvider[],
    excludeProviders: string[] = [],
    count: number = redundancyConfig.maxReplicas
  ): StorageProvider[] => {
    // Filter out inactive and excluded providers
    const availableProviders = providers.filter(p =>
      p.isActive && !excludeProviders.includes(p.address)
    );

    if (availableProviders.length < count) {
      throw new Error(`Need ${count} providers, only ${availableProviders.length} available`);
    }

    // Sort by reputation (descending) and storage price (ascending)
    return availableProviders
      .sort((a, b) => {
        const reputationDiff = b.reputation - a.reputation;
        if (reputationDiff !== 0) return reputationDiff;
        return Number(a.storagePrice || 0n) - Number(b.storagePrice || 0n);
      })
      .slice(0, count);
  }, [redundancyConfig.maxReplicas]);

  /**
   * Store data with redundancy across multiple providers
   */
  const storeWithRedundancyMutation = useMutation({
    mutationFn: async ({
      data,
      filename,
      keyId
    }: {
      data: Uint8Array;
      filename: string;
      keyId: string;
    }) => {
      if (!address || !signer) throw new Error('Wallet not connected');
      if (!providersQuery.data) throw new Error('No providers available');

      const providers = selectOptimalProviders(providersQuery.data);
      const dataHash = await crypto.subtle.digest('SHA-256', data);
      const dataHashHex = Array.from(new Uint8Array(dataHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      setStatus('🔐 Preparing encrypted data for storage...');
      setProgress(5);

      // Create file blob
      const dataBlob = new Blob([data], { type: 'application/octet-stream' });
      const dataFile = new File([dataBlob], filename);

      setStatus('🌐 Distributing data across multiple Filecoin providers...');
      setProgress(10);

      const deals: StorageDeal[] = [];
      const totalProviders = providers.length;

      // Upload to each selected provider
      for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];

        try {
          setStatus(`📤 Uploading to ${provider.name} (${i + 1}/${totalProviders})...`);
          setProgress(10 + ((i / totalProviders) * 70));

          // Upload file using existing upload hook
          const uploadResult = await new Promise<any>((resolve, reject) => {
            uploadFileMutation.mutate(dataFile, {
              onSuccess: resolve,
              onError: reject
            });
          });

          if (!uploadResult.uploadedInfo?.pieceCid) {
            throw new Error('Upload failed - no CID returned');
          }

          // Create deal record
          const deal: StorageDeal = {
            id: `${keyId}_${provider.id}_${Date.now()}`,
            owner: address,
            provider,
            dataCid: uploadResult.uploadedInfo.pieceCid,
            dealId: Math.floor(Math.random() * 1000000), // Mock deal ID
            startEpoch: Math.floor(Date.now() / 1000),
            endEpoch: Math.floor(Date.now() / 1000) + (config.persistencePeriod * 24 * 60 * 60),
            storagePrice: provider.storagePrice || 0n,
            dataHash: dataHashHex,
            status: 'active',
            createdAt: Date.now()
          };

          deals.push(deal);

        } catch (error) {
          console.error(`Failed to upload to ${provider.name}:`, error);
          // Continue with other providers
        }
      }

      if (deals.length < redundancyConfig.minReplicas) {
        throw new Error(
          `Failed to meet minimum redundancy: ${deals.length}/${redundancyConfig.minReplicas} replicas created`
        );
      }

      setStatus('⛓️ Recording storage deals on blockchain...');
      setProgress(85);

      // Here you would record the deals in the StorageRegistry contract
      // This is a placeholder

      const distributedStorage: DistributedStorage = {
        dataHash: dataHashHex,
        replicas: deals,
        redundancyMet: deals.length >= redundancyConfig.minReplicas,
        primaryCid: deals[0]?.dataCid || ''
      };

      setStatus(`✅ Data successfully stored across ${deals.length} providers!`);
      setProgress(100);

      return distributedStorage;
    },
    onError: (error) => {
      setStatus(`❌ Storage failed: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Retrieve data from any available replica
   */
  const retrieveDataMutation = useMutation({
    mutationFn: async ({ dataHash }: { dataHash: string }) => {
      if (!address || !signer) throw new Error('Wallet not connected');

      setStatus('🔍 Locating data replicas...');
      setProgress(10);

      // In real implementation, query StorageRegistry for replicas
      // For now, simulate finding replicas
      const mockReplicas = ['replica1_cid', 'replica2_cid', 'replica3_cid'];

      setStatus('📥 Retrieving data from Filecoin...');
      setProgress(30);

      // Try each replica until successful retrieval
      for (const replicaCid of mockReplicas) {
        try {
          // In real implementation, use Synapse SDK to retrieve from IPFS/Filecoin
          // For now, simulate successful retrieval
          setProgress(70);
          break;
        } catch (error) {
          console.error(`Failed to retrieve from ${replicaCid}:`, error);
          continue;
        }
      }

      setStatus('✅ Data successfully retrieved!');
      setProgress(100);

      // Return mock data - in real implementation, return actual retrieved data
      return new Uint8Array([1, 2, 3, 4, 5]);
    },
    onError: (error) => {
      setStatus(`❌ Retrieval failed: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Check and renew expiring storage deals
   */
  const renewDealsMutation = useMutation({
    mutationFn: async ({ deals }: { deals: StorageDeal[] }) => {
      if (!address || !signer) throw new Error('Wallet not connected');

      const now = Math.floor(Date.now() / 1000);
      const renewalThreshold = now + redundancyConfig.renewalWindow;

      // Find deals that need renewal
      const expiringDeals = deals.filter(deal =>
        deal.endEpoch <= renewalThreshold && deal.status === 'active'
      );

      if (expiringDeals.length === 0) {
        return { renewed: 0, message: 'No deals need renewal' };
      }

      setStatus(`🔄 Renewing ${expiringDeals.length} expiring storage deals...`);
      setProgress(20);

      let renewedCount = 0;

      for (const deal of expiringDeals) {
        try {
          // In real implementation, call StorageRegistry to renew deal
          // This is a placeholder

          deal.endEpoch = now + (config.persistencePeriod * 24 * 60 * 60);
          deal.status = 'renewed';
          renewedCount++;

          setProgress(20 + ((renewedCount / expiringDeals.length) * 60));
        } catch (error) {
          console.error(`Failed to renew deal ${deal.id}:`, error);
        }
      }

      setStatus(`✅ Renewed ${renewedCount}/${expiringDeals.length} storage deals!`);
      setProgress(100);

      return { renewed: renewedCount, total: expiringDeals.length };
    },
    onError: (error) => {
      setStatus(`❌ Renewal failed: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Check redundancy status for stored data
   */
  const checkRedundancy = useCallback(async (dataHash: string): Promise<{
    activeReplicas: number;
    totalReplicas: number;
    redundancyMet: boolean;
    failedReplicas: StorageDeal[];
  }> => {
    // In real implementation, query StorageRegistry contract
    // For now, return mock data
    return {
      activeReplicas: 3,
      totalReplicas: 5,
      redundancyMet: true,
      failedReplicas: []
    };
  }, []);

  /**
   * Calculate storage costs for redundant storage
   */
  const calculateStorageCosts = useCallback((
    dataSize: number,
    duration: number, // in days
    providers: StorageProvider[]
  ): {
    totalCost: bigint;
    costPerProvider: bigint[];
    averageCost: bigint;
  } => {
    const epochsPerDay = BigInt(2880); // Filecoin epochs per day
    const durationEpochs = BigInt(duration) * epochsPerDay;
    const dataSizeBigInt = BigInt(dataSize);

    const costPerProvider = providers.map(provider => {
      const baseCost = (provider.storagePrice || 0n) * durationEpochs;
      return (baseCost * dataSizeBigInt) / BigInt(1024 * 1024 * 1024); // Per GB
    });

    const totalCost = costPerProvider.reduce((sum, cost) => sum + cost, 0n);
    const averageCost = totalCost / BigInt(providers.length);

    return {
      totalCost,
      costPerProvider,
      averageCost
    };
  }, []);

  return {
    // State
    status,
    progress,
    redundancyConfig,
    providers: providersQuery.data || [],

    // Actions
    storeWithRedundancy: storeWithRedundancyMutation.mutate,
    retrieveData: retrieveDataMutation.mutate,
    renewDeals: renewDealsMutation.mutate,
    setRedundancyConfig,

    // Utilities
    selectOptimalProviders,
    checkRedundancy,
    calculateStorageCosts,

    // Loading states
    isLoadingProviders: providersQuery.isLoading,
    isStoring: storeWithRedundancyMutation.isPending,
    isRetrieving: retrieveDataMutation.isPending,
    isRenewing: renewDealsMutation.isPending,

    // Queries and mutations for direct access
    providersQuery,
    storeWithRedundancyMutation,
    retrieveDataMutation,
    renewDealsMutation
  };
};