import { ethers } from 'ethers';

export interface Guardian {
  address: string;
  name: string;
  email?: string;
  encryptedShare: string; // Encrypted recovery share for this guardian
  storageCid?: string; // Filecoin CID where guardian's data is stored
  isActive: boolean;
  addedAt: number; // Timestamp when guardian was added
}

export interface RecoveryProposal {
  id: string;
  proposer: string;
  newOwner: string;
  votesFor: number;
  votesAgainst: number;
  deadline: number; // Timestamp
  isExecuted: boolean;
  isActive: boolean;
  description: string;
  guardianVotes: { [guardianAddress: string]: boolean }; // true = for, false = against
}

export interface SocialRecoveryConfig {
  requiredApprovals: number; // Minimum guardian approvals needed
  totalGuardians: number; // Total number of guardians
  recoveryDelay: number; // Delay in seconds before recovery can be executed
  isInitialized: boolean;
}

export interface GuardianInvite {
  id: string;
  guardianAddress: string;
  guardianName: string;
  encryptedShare: string;
  inviteCode: string; // Unique code for guardian to accept invitation
  expiresAt: number;
  isAccepted: boolean;
  sentAt: number;
}

/**
 * Utility functions for Social Recovery
 */
export class SocialRecoveryUtils {
  /**
   * Generate a secure invite code for guardians
   */
  static generateInviteCode(): string {
    const bytes = ethers.randomBytes(16);
    return ethers.hexlify(bytes).replace('0x', '').toUpperCase();
  }

  /**
   * Create guardian invite
   */
  static createGuardianInvite(
    guardianAddress: string,
    guardianName: string,
    encryptedShare: string,
    validityHours: number = 168 // 1 week default
  ): GuardianInvite {
    const inviteCode = this.generateInviteCode();
    const expiresAt = Date.now() + (validityHours * 60 * 60 * 1000);

    return {
      id: ethers.keccak256(ethers.toUtf8Bytes(`${guardianAddress}_${Date.now()}`)),
      guardianAddress,
      guardianName,
      encryptedShare,
      inviteCode,
      expiresAt,
      isAccepted: false,
      sentAt: Date.now()
    };
  }

  /**
   * Validate guardian address
   */
  static validateGuardianAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  /**
   * Check if recovery proposal has enough votes
   */
  static hasEnoughVotes(proposal: RecoveryProposal, requiredApprovals: number): boolean {
    return proposal.votesFor >= requiredApprovals;
  }

  /**
   * Check if recovery proposal should be rejected
   */
  static shouldRejectProposal(proposal: RecoveryProposal, totalGuardians: number): boolean {
    // Reject if majority voted against
    const majorityThreshold = Math.floor(totalGuardians / 2) + 1;
    if (proposal.votesAgainst >= majorityThreshold) {
      return true;
    }

    // Reject if deadline passed without enough votes
    if (Date.now() >= proposal.deadline * 1000 && !this.hasEnoughVotes(proposal, majorityThreshold)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate time remaining for recovery proposal
   */
  static getTimeRemaining(deadline: number): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } {
    const now = Math.floor(Date.now() / 1000);
    const remaining = deadline - now;

    if (remaining <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);
    const seconds = remaining % 60;

    return { days, hours, minutes, seconds, isExpired: false };
  }

  /**
   * Format time remaining as human readable string
   */
  static formatTimeRemaining(deadline: number): string {
    const time = this.getTimeRemaining(deadline);

    if (time.isExpired) {
      return 'Expired';
    }

    if (time.days > 0) {
      return `${time.days}d ${time.hours}h remaining`;
    } else if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m remaining`;
    } else if (time.minutes > 0) {
      return `${time.minutes}m ${time.seconds}s remaining`;
    } else {
      return `${time.seconds}s remaining`;
    }
  }

  /**
   * Generate recovery proposal ID
   */
  static generateProposalId(
    owner: string,
    newOwner: string,
    proposer: string
  ): string {
    return ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'address', 'address', 'uint256'],
        [owner, newOwner, proposer, Date.now()]
      )
    );
  }

  /**
   * Encrypt recovery data for guardian
   */
  static async encryptForGuardian(
    data: string,
    guardianPublicKey: string
  ): Promise<string> {
    // This is a placeholder - implement actual encryption
    // In a real implementation, you'd use the guardian's public key
    // to encrypt the recovery data
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const encrypted = ethers.hexlify(dataBytes);
    return encrypted;
  }

  /**
   * Decrypt recovery data from guardian
   */
  static async decryptFromGuardian(
    encryptedData: string,
    guardianPrivateKey: string
  ): Promise<string> {
    // This is a placeholder - implement actual decryption
    try {
      const dataBytes = ethers.getBytes(encryptedData);
      const decoder = new TextDecoder();
      return decoder.decode(dataBytes);
    } catch {
      throw new Error('Failed to decrypt guardian data');
    }
  }

  /**
   * Validate social recovery configuration
   */
  static validateConfig(config: Partial<SocialRecoveryConfig>): string[] {
    const errors: string[] = [];

    if (!config.requiredApprovals || config.requiredApprovals < 1) {
      errors.push('Required approvals must be at least 1');
    }

    if (!config.totalGuardians || config.totalGuardians < 1) {
      errors.push('Must have at least 1 guardian');
    }

    if (config.requiredApprovals && config.totalGuardians &&
        config.requiredApprovals > config.totalGuardians) {
      errors.push('Required approvals cannot exceed total guardians');
    }

    if (!config.recoveryDelay || config.recoveryDelay < 3600) {
      errors.push('Recovery delay must be at least 1 hour (3600 seconds)');
    }

    return errors;
  }

  /**
   * Generate guardian recovery instructions
   */
  static generateGuardianInstructions(
    ownerName: string,
    keyVaultAddress: string,
    inviteCode: string
  ): string {
    return `
# KeyVault Guardian Instructions

You have been selected as a recovery guardian for ${ownerName}'s KeyVault.

## Your Responsibilities:
1. Keep your recovery share secure and accessible
2. Respond to legitimate recovery requests promptly
3. Verify the identity of the person requesting recovery
4. Vote on recovery proposals within the specified timeframe

## KeyVault Address: ${keyVaultAddress}
## Your Invite Code: ${inviteCode}

## How Recovery Works:
1. If ${ownerName} loses access to their keys, they or someone else can propose a recovery
2. You'll receive a notification about the recovery proposal
3. You have the option to vote FOR or AGAINST the recovery
4. If enough guardians vote FOR, the recovery will be executed after a delay period

## Security Notes:
- Never share your invite code or recovery share with anyone
- Always verify recovery requests through multiple channels
- Contact ${ownerName} directly if you're unsure about a recovery request

Thank you for helping secure ${ownerName}'s digital assets!
    `.trim();
  }

  /**
   * Calculate optimal number of guardians and threshold
   */
  static suggestGuardianConfig(securityLevel: 'basic' | 'standard' | 'high'): {
    totalGuardians: number;
    requiredApprovals: number;
    recoveryDelay: number;
  } {
    switch (securityLevel) {
      case 'basic':
        return {
          totalGuardians: 3,
          requiredApprovals: 2, // 2 of 3
          recoveryDelay: 24 * 60 * 60 // 1 day
        };
      case 'standard':
        return {
          totalGuardians: 5,
          requiredApprovals: 3, // 3 of 5
          recoveryDelay: 48 * 60 * 60 // 2 days
        };
      case 'high':
        return {
          totalGuardians: 7,
          requiredApprovals: 4, // 4 of 7
          recoveryDelay: 72 * 60 * 60 // 3 days
        };
      default:
        return {
          totalGuardians: 5,
          requiredApprovals: 3,
          recoveryDelay: 48 * 60 * 60
        };
    }
  }

  /**
   * Check if guardian can still vote on proposal
   */
  static canGuardianVote(
    proposal: RecoveryProposal,
    guardianAddress: string
  ): boolean {
    // Can't vote if proposal is not active
    if (!proposal.isActive) return false;

    // Can't vote if deadline passed
    if (Date.now() >= proposal.deadline * 1000) return false;

    // Can't vote if already voted
    if (guardianAddress in proposal.guardianVotes) return false;

    return true;
  }

  /**
   * Get voting statistics for a proposal
   */
  static getVotingStats(proposal: RecoveryProposal, totalGuardians: number) {
    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const abstained = totalGuardians - totalVotes;
    const participationRate = (totalVotes / totalGuardians) * 100;

    return {
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      abstained,
      totalVotes,
      participationRate: Math.round(participationRate),
      status: this.getProposalStatus(proposal, totalGuardians)
    };
  }

  /**
   * Get human readable proposal status
   */
  static getProposalStatus(proposal: RecoveryProposal, totalGuardians: number): string {
    if (proposal.isExecuted) return 'Executed';
    if (!proposal.isActive) return 'Inactive';

    const now = Math.floor(Date.now() / 1000);
    if (now >= proposal.deadline) return 'Expired';

    const majorityThreshold = Math.floor(totalGuardians / 2) + 1;
    if (proposal.votesAgainst >= majorityThreshold) return 'Rejected';
    if (proposal.votesFor >= majorityThreshold) return 'Approved - Waiting for Execution';

    return 'Active - Collecting Votes';
  }
}