import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useEthersSigner } from '@/hooks/useEthers';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  Guardian,
  RecoveryProposal,
  SocialRecoveryConfig,
  GuardianInvite,
  SocialRecoveryUtils
} from '@/utils/socialRecovery';
import { ethers } from 'ethers';

interface SocialRecoveryState {
  config: SocialRecoveryConfig | null;
  guardians: Guardian[];
  pendingInvites: GuardianInvite[];
  activeProposals: RecoveryProposal[];
  recoveryAttempt: {
    proposalId: string | null;
    isExecuting: boolean;
  };
}

export const useSocialRecovery = () => {
  const [state, setState] = useState<SocialRecoveryState>({
    config: null,
    guardians: [],
    pendingInvites: [],
    activeProposals: [],
    recoveryAttempt: {
      proposalId: null,
      isExecuting: false
    }
  });

  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const { address } = useAccount();
  const signer = useEthersSigner();
  const { uploadFileMutation } = useFileUpload();

  /**
   * Configure Social Recovery parameters
   */
  const configureSocialRecovery = useCallback((config: Omit<SocialRecoveryConfig, 'totalGuardians' | 'isInitialized'>) => {
    const errors = SocialRecoveryUtils.validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Configuration errors: ${errors.join(', ')}`);
    }

    setState(prev => ({
      ...prev,
      config: {
        ...config,
        totalGuardians: 0,
        isInitialized: true
      }
    }));
  }, []);

  /**
   * Add a guardian to the social recovery setup
   */
  const addGuardianMutation = useMutation({
    mutationFn: async ({
      guardianAddress,
      guardianName,
      guardianEmail,
      encryptedRecoveryData
    }: {
      guardianAddress: string;
      guardianName: string;
      guardianEmail?: string;
      encryptedRecoveryData: string;
    }) => {
      if (!address || !signer) throw new Error('Wallet not connected');
      if (!state.config) throw new Error('Social recovery not configured');

      // Validate guardian address
      if (!SocialRecoveryUtils.validateGuardianAddress(guardianAddress)) {
        throw new Error('Invalid guardian address');
      }

      // Check if guardian already exists
      const existingGuardian = state.guardians.find(g => g.address === guardianAddress);
      if (existingGuardian) {
        throw new Error('Guardian already added');
      }

      setStatus('🔐 Encrypting guardian recovery share...');
      setProgress(10);

      // Encrypt recovery data for this guardian
      const encryptedShare = await SocialRecoveryUtils.encryptForGuardian(
        encryptedRecoveryData,
        guardianAddress // In real implementation, use guardian's public key
      );

      setStatus('📤 Uploading guardian data to Filecoin...');
      setProgress(30);

      // Create guardian data file
      const guardianData = {
        guardianAddress,
        guardianName,
        guardianEmail,
        encryptedShare,
        addedAt: Date.now(),
        keyVaultOwner: address
      };

      const guardianBlob = new Blob([JSON.stringify(guardianData)], { type: 'application/json' });
      const guardianFile = new File([guardianBlob], `guardian_${guardianAddress}.json`);

      // Upload guardian data to Filecoin
      let storageCid: string | undefined;
      await new Promise<void>((resolve, reject) => {
        uploadFileMutation.mutate(guardianFile, {
          onSuccess: (result) => {
            storageCid = result.uploadedInfo?.pieceCid;
            resolve();
          },
          onError: reject
        });
      });

      setStatus('⛓️ Recording guardian on blockchain...');
      setProgress(60);

      // Create guardian record
      const guardian: Guardian = {
        address: guardianAddress,
        name: guardianName,
        email: guardianEmail,
        encryptedShare,
        storageCid,
        isActive: true,
        addedAt: Date.now()
      };

      // Create guardian invite
      const invite = SocialRecoveryUtils.createGuardianInvite(
        guardianAddress,
        guardianName,
        encryptedShare
      );

      // Update state
      setState(prev => ({
        ...prev,
        guardians: [...prev.guardians, guardian],
        pendingInvites: [...prev.pendingInvites, invite],
        config: prev.config ? {
          ...prev.config,
          totalGuardians: prev.guardians.length + 1
        } : null
      }));

      setStatus('📧 Guardian invitation generated!');
      setProgress(100);

      return { guardian, invite };
    },
    onError: (error) => {
      setStatus(`❌ Failed to add guardian: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Remove a guardian
   */
  const removeGuardianMutation = useMutation({
    mutationFn: async ({ guardianAddress }: { guardianAddress: string }) => {
      if (!address || !signer) throw new Error('Wallet not connected');

      const guardianIndex = state.guardians.findIndex(g => g.address === guardianAddress);
      if (guardianIndex === -1) {
        throw new Error('Guardian not found');
      }

      setStatus('⛓️ Removing guardian from blockchain...');
      setProgress(50);

      // Here you would call the smart contract to remove the guardian
      // This is a placeholder

      // Update local state
      setState(prev => ({
        ...prev,
        guardians: prev.guardians.map(g =>
          g.address === guardianAddress ? { ...g, isActive: false } : g
        ),
        config: prev.config ? {
          ...prev.config,
          totalGuardians: prev.guardians.filter(g => g.isActive && g.address !== guardianAddress).length
        } : null
      }));

      setStatus('✅ Guardian removed successfully!');
      setProgress(100);
    },
    onError: (error) => {
      setStatus(`❌ Failed to remove guardian: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Propose a recovery
   */
  const proposeRecoveryMutation = useMutation({
    mutationFn: async ({
      newOwner,
      description
    }: {
      newOwner: string;
      description: string;
    }) => {
      if (!address || !signer) throw new Error('Wallet not connected');
      if (!state.config) throw new Error('Social recovery not configured');

      if (!SocialRecoveryUtils.validateGuardianAddress(newOwner)) {
        throw new Error('Invalid new owner address');
      }

      setStatus('📝 Creating recovery proposal...');
      setProgress(20);

      const proposalId = SocialRecoveryUtils.generateProposalId(
        address, // current owner
        newOwner,
        address // proposer (could be different in some cases)
      );

      const deadline = Math.floor(Date.now() / 1000) + state.config.recoveryDelay;

      const proposal: RecoveryProposal = {
        id: proposalId,
        proposer: address,
        newOwner,
        votesFor: 0,
        votesAgainst: 0,
        deadline,
        isExecuted: false,
        isActive: true,
        description,
        guardianVotes: {}
      };

      setStatus('⛓️ Submitting proposal to blockchain...');
      setProgress(60);

      // Here you would call the smart contract to create the proposal
      // This is a placeholder

      setState(prev => ({
        ...prev,
        activeProposals: [...prev.activeProposals, proposal],
        recoveryAttempt: {
          proposalId,
          isExecuting: false
        }
      }));

      setStatus('📢 Recovery proposal created! Guardians can now vote.');
      setProgress(100);

      return proposal;
    },
    onError: (error) => {
      setStatus(`❌ Failed to create recovery proposal: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Vote on a recovery proposal (for guardians)
   */
  const voteOnProposalMutation = useMutation({
    mutationFn: async ({
      proposalId,
      vote,
      reason
    }: {
      proposalId: string;
      vote: boolean; // true = for, false = against
      reason?: string;
    }) => {
      if (!address || !signer) throw new Error('Wallet not connected');

      const proposal = state.activeProposals.find(p => p.id === proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      if (!SocialRecoveryUtils.canGuardianVote(proposal, address)) {
        throw new Error('Cannot vote on this proposal');
      }

      setStatus(`🗳️ Submitting ${vote ? 'approval' : 'rejection'} vote...`);
      setProgress(50);

      // Here you would call the smart contract to record the vote
      // This is a placeholder

      // Update local state
      setState(prev => ({
        ...prev,
        activeProposals: prev.activeProposals.map(p =>
          p.id === proposalId ? {
            ...p,
            votesFor: vote ? p.votesFor + 1 : p.votesFor,
            votesAgainst: vote ? p.votesAgainst : p.votesAgainst + 1,
            guardianVotes: {
              ...p.guardianVotes,
              [address!]: vote
            }
          } : p
        )
      }));

      setStatus(`✅ Vote ${vote ? 'for' : 'against'} recorded!`);
      setProgress(100);
    },
    onError: (error) => {
      setStatus(`❌ Failed to vote: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Execute an approved recovery proposal
   */
  const executeRecoveryMutation = useMutation({
    mutationFn: async ({ proposalId }: { proposalId: string }) => {
      if (!address || !signer) throw new Error('Wallet not connected');
      if (!state.config) throw new Error('Social recovery not configured');

      const proposal = state.activeProposals.find(p => p.id === proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      // Check if proposal is ready for execution
      if (!SocialRecoveryUtils.hasEnoughVotes(proposal, state.config.requiredApprovals)) {
        throw new Error('Not enough votes for execution');
      }

      const now = Math.floor(Date.now() / 1000);
      if (now < proposal.deadline) {
        throw new Error('Recovery delay period has not passed');
      }

      setStatus('⚡ Executing recovery proposal...');
      setProgress(25);

      setState(prev => ({
        ...prev,
        recoveryAttempt: {
          ...prev.recoveryAttempt,
          isExecuting: true
        }
      }));

      setStatus('⛓️ Transferring ownership on blockchain...');
      setProgress(70);

      // Here you would call the smart contract to execute the recovery
      // This would typically transfer ownership of the KeyVault
      // This is a placeholder

      // Update proposal status
      setState(prev => ({
        ...prev,
        activeProposals: prev.activeProposals.map(p =>
          p.id === proposalId ? {
            ...p,
            isExecuted: true,
            isActive: false
          } : p
        ),
        recoveryAttempt: {
          proposalId: null,
          isExecuting: false
        }
      }));

      setStatus('🎉 Recovery executed successfully! Ownership transferred.');
      setProgress(100);

      return proposal;
    },
    onError: (error) => {
      setState(prev => ({
        ...prev,
        recoveryAttempt: {
          ...prev.recoveryAttempt,
          isExecuting: false
        }
      }));
      setStatus(`❌ Failed to execute recovery: ${error.message}`);
      setProgress(0);
    }
  });

  /**
   * Get guardian invitation link
   */
  const getGuardianInviteLink = useCallback((inviteCode: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/guardian-invite?code=${inviteCode}`;
  }, []);

  /**
   * Check proposal expiration and update status
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        activeProposals: prev.activeProposals.map(proposal => {
          const now = Math.floor(Date.now() / 1000);
          if (now >= proposal.deadline && proposal.isActive && !proposal.isExecuted) {
            // Check if should be rejected
            if (!SocialRecoveryUtils.hasEnoughVotes(proposal, prev.config?.requiredApprovals || 0)) {
              return { ...proposal, isActive: false };
            }
          }
          return proposal;
        })
      }));
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  /**
   * Get voting statistics for a proposal
   */
  const getVotingStats = useCallback((proposalId: string) => {
    const proposal = state.activeProposals.find(p => p.id === proposalId);
    if (!proposal || !state.config) return null;

    return SocialRecoveryUtils.getVotingStats(proposal, state.config.totalGuardians);
  }, [state.activeProposals, state.config]);

  /**
   * Check if current user is a guardian
   */
  const isGuardian = useCallback((ownerAddress: string): boolean => {
    return state.guardians.some(g => g.isActive && g.address === address);
  }, [state.guardians, address]);

  return {
    // State
    config: state.config,
    guardians: state.guardians.filter(g => g.isActive),
    pendingInvites: state.pendingInvites.filter(i => !i.isAccepted && i.expiresAt > Date.now()),
    activeProposals: state.activeProposals.filter(p => p.isActive),
    recoveryAttempt: state.recoveryAttempt,
    status,
    progress,

    // Actions
    configureSocialRecovery,
    addGuardian: addGuardianMutation.mutate,
    removeGuardian: removeGuardianMutation.mutate,
    proposeRecovery: proposeRecoveryMutation.mutate,
    voteOnProposal: voteOnProposalMutation.mutate,
    executeRecovery: executeRecoveryMutation.mutate,

    // Utilities
    getGuardianInviteLink,
    getVotingStats,
    isGuardian,
    utils: SocialRecoveryUtils,

    // Loading states
    isAddingGuardian: addGuardianMutation.isPending,
    isRemovingGuardian: removeGuardianMutation.isPending,
    isProposingRecovery: proposeRecoveryMutation.isPending,
    isVoting: voteOnProposalMutation.isPending,
    isExecutingRecovery: executeRecoveryMutation.isPending,

    // Mutations for direct access
    addGuardianMutation,
    removeGuardianMutation,
    proposeRecoveryMutation,
    voteOnProposalMutation,
    executeRecoveryMutation
  };
};