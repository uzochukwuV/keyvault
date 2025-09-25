/*
    This is the configuration for the upload dApp using Synapse.
    It is used to configure the storage capacity, the persistence period, and the minimum number of days of lockup needed so the app can notify to pay for more storage.
*/

export const config = {
  // The number of GB of storage capacity needed to be sufficient
  storageCapacity: 10,
  // The number of days of lockup needed to be sufficient
  persistencePeriod: 30,
  // The minimum number of days of lockup needed to be sufficient
  minDaysThreshold: 10,
  // Whether to use CDN for the storage for faster retrieval
  withCDN: true,

  // KeyVault specific configurations
  keyVault: {
    // Default redundancy settings
    minReplicas: 3,
    maxReplicas: 5,
    // Encryption settings
    encryptionAlgorithm: 'AES-GCM',
    keyDerivationIterations: 100000,
    // Shamir Secret Sharing defaults
    defaultShamirThreshold: 2,
    defaultShamirShares: 3,
    // Social Recovery defaults
    defaultRequiredApprovals: 3,
    defaultRecoveryDelay: 48 * 60 * 60, // 48 hours in seconds
    // Storage settings
    shareStoragePeriod: 365, // 1 year for shares
    keyStoragePeriod: 365 * 5 // 5 years for keys
  }
} satisfies {
  storageCapacity: number;
  persistencePeriod: number;
  minDaysThreshold: number;
  withCDN: boolean;
  keyVault: {
    minReplicas: number;
    maxReplicas: number;
    encryptionAlgorithm: string;
    keyDerivationIterations: number;
    defaultShamirThreshold: number;
    defaultShamirShares: number;
    defaultRequiredApprovals: number;
    defaultRecoveryDelay: number;
    shareStoragePeriod: number;
    keyStoragePeriod: number;
  };
};
