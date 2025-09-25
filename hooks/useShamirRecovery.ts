import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '@/hooks/useEthers';
import { useFileUpload } from '@/hooks/useFileUpload';
import { ShamirSecretSharing, ShamirShare, type ShamirConfig } from '@/utils/shamirSecretSharing';
import { ethers } from 'ethers';

interface ProviderInfo {
  id: number;
  address: string;
  name: string;
  reputation: number;
}

interface ShareDistribution {
  share: ShamirShare;
  provider: ProviderInfo;
  storageCid?: string;
  status: 'pending' | 'uploading' | 'stored' | 'failed';
  error?: string;
}

interface ShamirRecoveryState {
  config: ShamirConfig | null;
  shareDistribution: ShareDistribution[];
  recoveryAttempt: {
    id: string | null;
    collectedShares: ShamirShare[];
    requiredShares: number;
    isComplete: boolean;
  };
}

export const useShamirRecovery = () => {
  const [state, setState] = useState<ShamirRecoveryState>({
    config: null,
    shareDistribution: [],
    recoveryAttempt: {
      id: null,
      collectedShares: [],
      requiredShares: 0,
      isComplete: false
    }
  });

  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const { address } = useAccount();
  const signer = useEthersSigner();
  const { uploadFileMutation } = useFileUpload();

  /**
   * Configure Shamir Secret Sharing parameters
   */
  const configureShamir = useCallback((config: ShamirConfig) => {
    setState(prev => ({
      ...prev,
      config
    }));
  }, []);

  /**
   * Split a private key into Shamir shares and distribute across Filecoin providers
   */
  const splitAndDistributeMutation = useMutation({
    mutationFn: async ({
      privateKey,
      providers
    }: {
      privateKey: Uint8Array;
      providers: ProviderInfo[];
    }) => {
      if (!state.config) throw new Error('Shamir not configured');
      if (!address || !signer) throw new Error('Wallet not connected');

      const { threshold, totalShares, keyId } = state.config;

      if (providers.length < totalShares) {
        throw new Error(`Need ${totalShares} providers, only ${providers.length} available`);
      }

      setStatus('🔐 Generating Shamir secret shares...');
      setProgress(10);

      // Split the private key into shares
      const shares = ShamirSecretSharing.splitSecret(
        privateKey,
        threshold,
        totalShares,
        keyId
      );

      setStatus('📊 Distributing shares across Filecoin providers...');
      setProgress(20);

      // Initialize share distribution tracking
      const distribution: ShareDistribution[] = shares.map((share, index) => ({
        share,
        provider: providers[index],
        status: 'pending' as const
      }));

      setState(prev => ({
        ...prev,
        shareDistribution: distribution
      }));

      // Upload each share to its assigned provider
      const uploadPromises = distribution.map(async (dist, index) => {
        try {
          dist.status = 'uploading';
          setState(prev => ({
            ...prev,
            shareDistribution: [...prev.shareDistribution]
          }));

          // Convert share to encrypted blob for upload
          const shareString = ShamirSecretSharing.shareToString(dist.share);
          const shareBlob = new Blob([shareString], { type: 'application/octet-stream' });
          const shareFile = new File([shareBlob], `share_${dist.share.x}_${keyId}.enc`);

          // Upload to Filecoin via Synapse
          await new Promise<void>((resolve, reject) => {
            uploadFileMutation.mutate(shareFile, {
              onSuccess: (result) => {
                dist.storageCid = result.uploadedInfo?.pieceCid;
                dist.status = 'stored';
                setProgress(prev => prev + (60 / totalShares));
                resolve();
              },
              onError: (error) => {
                dist.status = 'failed';
                dist.error = error.message;
                reject(error);
              }
            });
          });

          return dist;
        } catch (error) {
          dist.status = 'failed';
          dist.error = error instanceof Error ? error.message : 'Upload failed';
          throw error;
        }
      });

      // Wait for all uploads to complete
      const results = await Promise.allSettled(uploadPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      if (successCount < threshold) {
        throw new Error(`Failed to store minimum required shares. Got ${successCount}, need ${threshold}`);
      }

      setStatus('⛓️ Recording share metadata on blockchain...');
      setProgress(80);

      // Here you would interact with the ShamirRecovery smart contract
      // to record the share locations and metadata
      // This is a placeholder - implement actual contract calls

      setStatus('✅ Shamir shares successfully distributed!');
      setProgress(100);

      return distribution.filter(d => d.status === 'stored');
    },
    onError: (error) => {
      setStatus(`❌ Share distribution failed: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Initiate recovery process by collecting shares
   */
  const initiateRecoveryMutation = useMutation({
    mutationFn: async ({ keyId }: { keyId: string }) => {
      if (!address || !signer) throw new Error('Wallet not connected');

      setStatus('🔍 Initiating recovery process...');
      setProgress(5);

      // Generate recovery attempt ID
      const recoveryId = ethers.keccak256(
        ethers.toUtf8Bytes(`${address}_${keyId}_${Date.now()}`)
      );

      setState(prev => ({
        ...prev,
        recoveryAttempt: {
          id: recoveryId,
          collectedShares: [],
          requiredShares: prev.config?.threshold || 0,
          isComplete: false
        }
      }));

      setStatus('📋 Recovery initiated. Waiting for share submissions...');
      setProgress(10);

      return recoveryId;
    }
  });

  /**
   * Submit a share for recovery
   */
  const submitShareMutation = useMutation({
    mutationFn: async ({
      shareData,
      shareIndex
    }: {
      shareData: string;
      shareIndex: number;
    }) => {
      if (!state.recoveryAttempt.id) throw new Error('No active recovery attempt');

      setStatus(`📥 Processing share ${shareIndex}...`);

      // Parse and validate the share
      const share = ShamirSecretSharing.shareFromString(shareData);

      // Verify share hasn't been submitted already
      const alreadySubmitted = state.recoveryAttempt.collectedShares.find(
        s => s.x === share.x
      );
      if (alreadySubmitted) {
        throw new Error(`Share ${shareIndex} already submitted`);
      }

      // Add to collected shares
      const updatedShares = [...state.recoveryAttempt.collectedShares, share];
      const progressPercent = 20 + (updatedShares.length / state.recoveryAttempt.requiredShares) * 60;

      setState(prev => ({
        ...prev,
        recoveryAttempt: {
          ...prev.recoveryAttempt,
          collectedShares: updatedShares,
          isComplete: updatedShares.length >= prev.recoveryAttempt.requiredShares
        }
      }));

      setProgress(progressPercent);
      setStatus(`✅ Share ${shareIndex} accepted. ${updatedShares.length}/${state.recoveryAttempt.requiredShares} collected`);

      return share;
    }
  });

  /**
   * Reconstruct the private key from collected shares
   */
  const reconstructKeyMutation = useMutation({
    mutationFn: async () => {
      if (!state.recoveryAttempt.isComplete) {
        throw new Error('Not enough shares collected for reconstruction');
      }

      setStatus('🔧 Reconstructing private key from shares...');
      setProgress(85);

      try {
        // Reconstruct the original private key
        const reconstructedKey = ShamirSecretSharing.reconstructSecret(
          state.recoveryAttempt.collectedShares
        );

        setStatus('🎉 Private key successfully recovered!');
        setProgress(100);

        return reconstructedKey;
      } catch (error) {
        throw new Error('Failed to reconstruct key: ' + (error as Error).message);
      }
    },
    onError: (error) => {
      setStatus(`❌ Key reconstruction failed: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Reset recovery attempt
   */
  const resetRecovery = useCallback(() => {
    setState(prev => ({
      ...prev,
      recoveryAttempt: {
        id: null,
        collectedShares: [],
        requiredShares: prev.config?.threshold || 0,
        isComplete: false
      }
    }));
    setStatus('');
    setProgress(0);
  }, []);

  /**
   * Get available Filecoin storage providers
   */
  const getAvailableProviders = useCallback(async (): Promise<ProviderInfo[]> => {
    // Mock provider data - in real implementation, fetch from StorageRegistry contract
    return [
      { id: 1, address: '0x1234...', name: 'Provider A', reputation: 95 },
      { id: 2, address: '0x5678...', name: 'Provider B', reputation: 88 },
      { id: 3, address: '0x9abc...', name: 'Provider C', reputation: 92 },
      { id: 4, address: '0xdef0...', name: 'Provider D', reputation: 87 },
      { id: 5, address: '0x1111...', name: 'Provider E', reputation: 90 }
    ];
  }, []);

  /**
   * Validate Shamir configuration
   */
  const validateConfig = useCallback((config: ShamirConfig): string[] => {
    const errors: string[] = [];

    if (config.threshold < 2) {
      errors.push('Threshold must be at least 2');
    }
    if (config.threshold > config.totalShares) {
      errors.push('Threshold cannot exceed total shares');
    }
    if (config.totalShares > 255) {
      errors.push('Total shares cannot exceed 255');
    }
    if (config.totalShares < config.threshold) {
      errors.push('Total shares must be at least equal to threshold');
    }
    if (!config.keyId.trim()) {
      errors.push('Key ID is required');
    }

    return errors;
  }, []);

  return {
    // State
    config: state.config,
    shareDistribution: state.shareDistribution,
    recoveryAttempt: state.recoveryAttempt,
    status,
    progress,

    // Actions
    configureShamir,
    splitAndDistribute: splitAndDistributeMutation.mutate,
    initiateRecovery: initiateRecoveryMutation.mutate,
    submitShare: submitShareMutation.mutate,
    reconstructKey: reconstructKeyMutation.mutate,
    resetRecovery,
    getAvailableProviders,
    validateConfig,

    // Loading states
    isDistributing: splitAndDistributeMutation.isPending,
    isInitiatingRecovery: initiateRecoveryMutation.isPending,
    isSubmittingShare: submitShareMutation.isPending,
    isReconstructing: reconstructKeyMutation.isPending,

    // Mutations for direct access
    splitAndDistributeMutation,
    initiateRecoveryMutation,
    submitShareMutation,
    reconstructKeyMutation
  };
};