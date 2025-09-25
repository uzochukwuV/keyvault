import { ApprovedProviderInfo, EnhancedDataSetInfo } from "@filoz/synapse-sdk";

/**
 * Interface for encrypted key shares
 */
export interface KeyShare {
  id: string;
  shareIndex: number;
  encryptedShare: string;
  shareSize: number;
  timestamp: number;
  recoveryMethod: 'shamir' | 'social';
  metadata: {
    threshold: number; // M in M-of-N
    totalShares: number; // N in M-of-N
    keyId: string;
    description?: string;
  };
}

/**
 * Storage location for a key share
 */
export interface ShareStorageLocation {
  shareId: string;
  providerId: number;
  datasetId: string;
  pieceCid: string;
  txHash?: string;
  storedAt: number;
  expiresAt: number;
  provider: ApprovedProviderInfo;
  dataset: EnhancedDataSetInfo;
}

/**
 * Key vault configuration
 */
export interface KeyVaultConfig {
  shamirThreshold: number; // M in M-of-N
  shamirTotalShares: number; // N in M-of-N
  socialRecoveryContacts: number;
  minProviders: number; // Minimum number of different providers
  redundancyFactor: number; // How many copies per share
  maxShareSize: number; // Maximum size per share in bytes
  renewalThresholdDays: number; // Days before expiry to renew
}

/**
 * Storage distribution plan
 */
export interface DistributionPlan {
  shares: KeyShare[];
  locations: ShareStorageLocation[];
  totalCost: bigint;
  storageDuration: number; // Days
  providers: ApprovedProviderInfo[];
  estimatedRetrievalTime: number; // Seconds
}

/**
 * Recovery session
 */
export interface RecoverySession {
  sessionId: string;
  keyId: string;
  recoveryMethod: 'shamir' | 'social';
  requiredShares: number;
  collectedShares: KeyShare[];
  shareLocations: ShareStorageLocation[];
  status: 'pending' | 'collecting' | 'reconstructing' | 'complete' | 'failed';
  createdAt: number;
  expiresAt: number;
}

/**
 * Storage metrics for monitoring
 */
export interface StorageMetrics {
  totalShares: number;
  activeShares: number;
  expiredShares: number;
  totalStorageCost: bigint;
  monthlyStorageCost: bigint;
  averageRetrievalTime: number;
  providerDistribution: Record<string, number>;
  healthScore: number; // 0-100
}