"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKeyVault } from "@/hooks/useKeyVault";
import { useShamirRecovery } from "@/hooks/useShamirRecovery";
import { useSocialRecovery } from "@/hooks/useSocialRecovery";

type RecoveryMethod = 'shamir' | 'social';

export const KeyRecoveryPanel = () => {
  const [selectedMethod, setSelectedMethod] = useState<RecoveryMethod | null>(null);
  const [shareData, setShareData] = useState("");
  const [shareIndex, setShareIndex] = useState("");

  const { keys } = useKeyVault();
  const {
    recoveryAttempt: shamirAttempt,
    status: shamirStatus,
    progress: shamirProgress,
    submitShare,
    reconstructKey,
    isSubmittingShare,
    isReconstructing
  } = useShamirRecovery();

  const {
    activeProposals,
    guardians,
    status: socialStatus,
    progress: socialProgress,
    voteOnProposal,
    executeRecovery,
    isVoting,
    isExecutingRecovery
  } = useSocialRecovery();

  const handleSubmitShare = async () => {
    if (!shareData.trim() || !shareIndex.trim()) return;

    try {
      await submitShare({
        shareData: shareData.trim(),
        shareIndex: parseInt(shareIndex)
      });
      setShareData("");
      setShareIndex("");
    } catch (error) {
      console.error('Failed to submit share:', error);
      alert('Failed to submit share: ' + (error as Error).message);
    }
  };

  const handleReconstructKey = async () => {
    try {
      const reconstructedKey = await reconstructKey();
      alert('Key successfully reconstructed! Check console for key data.');
      console.log('Reconstructed key:', reconstructedKey);
    } catch (error) {
      console.error('Failed to reconstruct key:', error);
      alert('Failed to reconstruct key: ' + (error as Error).message);
    }
  };

  const handleVoteOnProposal = async (proposalId: string, vote: boolean) => {
    try {
      await voteOnProposal({
        proposalId,
        vote,
        reason: prompt(`Reason for ${vote ? 'approving' : 'rejecting'} this recovery:`) || undefined
      });
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('Failed to vote: ' + (error as Error).message);
    }
  };

  const handleExecuteRecovery = async (proposalId: string) => {
    try {
      await executeRecovery({ proposalId });
    } catch (error) {
      console.error('Failed to execute recovery:', error);
      alert('Failed to execute recovery: ' + (error as Error).message);
    }
  };

  const recoverableKeys = keys.filter(key => key.hasSharedShares || key.hasSocialBackup);

  if (recoverableKeys.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">🔄</div>
        <h3 className="text-xl font-semibold mb-2">No Recovery Options Available</h3>
        <p className="text-muted-foreground mb-6">
          You don't have any keys with recovery methods enabled.
        </p>
        <p className="text-sm text-muted-foreground">
          Store a key with Shamir Secret Sharing or Social Recovery to enable key recovery.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">🔄 Key Recovery</h2>
        <p className="text-muted-foreground">
          Recover your private keys using Shamir Secret Sharing or Social Recovery methods
        </p>
      </div>

      {/* Recovery Method Selection */}
      {!selectedMethod && (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedMethod('shamir')}
            className="border border-border rounded-lg p-6 cursor-pointer hover:border-primary transition-all"
          >
            <div className="text-center space-y-4">
              <div className="text-4xl">🔀</div>
              <h3 className="text-xl font-semibold">Shamir Secret Sharing</h3>
              <p className="text-muted-foreground text-sm">
                Reconstruct your private key by collecting the minimum required shares
                from distributed storage locations.
              </p>
              <div className="text-xs text-muted-foreground">
                Keys with Shamir backup: {keys.filter(k => k.hasSharedShares).length}
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedMethod('social')}
            className="border border-border rounded-lg p-6 cursor-pointer hover:border-primary transition-all"
          >
            <div className="text-center space-y-4">
              <div className="text-4xl">👥</div>
              <h3 className="text-xl font-semibold">Social Recovery</h3>
              <p className="text-muted-foreground text-sm">
                Recover access through trusted guardians who can vote on recovery proposals.
              </p>
              <div className="text-xs text-muted-foreground">
                Keys with social backup: {keys.filter(k => k.hasSocialBackup).length}
                <br />
                Active guardians: {guardians.length}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Shamir Recovery Interface */}
      <AnimatePresence>
        {selectedMethod === 'shamir' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">🔀 Shamir Recovery Process</h3>
              <button
                onClick={() => setSelectedMethod(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            </div>

            {/* Status Display */}
            {(shamirStatus || shamirProgress > 0) && (
              <div className="p-4 bg-accent/50 rounded-lg border border-accent">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{shamirStatus}</span>
                  <span className="text-sm text-muted-foreground">{shamirProgress}%</span>
                </div>
                {shamirProgress > 0 && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      className="bg-primary rounded-full h-2"
                      initial={{ width: 0 }}
                      animate={{ width: `${shamirProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Recovery Attempt Info */}
            {shamirAttempt.id && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Active Recovery Session</h4>
                <div className="text-sm space-y-1">
                  <div>Session ID: <span className="font-mono text-xs">{shamirAttempt.id}</span></div>
                  <div>Collected Shares: {shamirAttempt.collectedShares.length} / {shamirAttempt.requiredShares}</div>
                  <div>Status: {shamirAttempt.isComplete ? '✅ Ready for reconstruction' : '⏳ Collecting shares'}</div>
                </div>
              </div>
            )}

            {/* Share Submission */}
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-4">Submit Recovery Share</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Share Index</label>
                  <input
                    type="number"
                    min="1"
                    value={shareIndex}
                    onChange={(e) => setShareIndex(e.target.value)}
                    placeholder="Enter share index (1-N)"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Share Data</label>
                  <textarea
                    value={shareData}
                    onChange={(e) => setShareData(e.target.value)}
                    placeholder="Paste your recovery share data here..."
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px] font-mono text-sm"
                  />
                </div>

                <button
                  onClick={handleSubmitShare}
                  disabled={!shareData.trim() || !shareIndex.trim() || isSubmittingShare}
                  className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSubmittingShare ? "🔄 Submitting Share..." : "📤 Submit Share"}
                </button>
              </div>
            </div>

            {/* Reconstruction */}
            {shamirAttempt.isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg p-6"
              >
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-4">
                  ✅ Ready for Key Reconstruction
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                  You have collected enough shares to reconstruct your private key.
                </p>
                <button
                  onClick={handleReconstructKey}
                  disabled={isReconstructing}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isReconstructing ? "🔄 Reconstructing..." : "🔧 Reconstruct Private Key"}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Social Recovery Interface */}
      <AnimatePresence>
        {selectedMethod === 'social' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">👥 Social Recovery Process</h3>
              <button
                onClick={() => setSelectedMethod(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            </div>

            {/* Status Display */}
            {(socialStatus || socialProgress > 0) && (
              <div className="p-4 bg-accent/50 rounded-lg border border-accent">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{socialStatus}</span>
                  <span className="text-sm text-muted-foreground">{socialProgress}%</span>
                </div>
                {socialProgress > 0 && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      className="bg-primary rounded-full h-2"
                      initial={{ width: 0 }}
                      animate={{ width: `${socialProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Active Proposals */}
            {activeProposals.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Active Recovery Proposals</h4>
                {activeProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">Recovery Proposal</div>
                        <div className="text-sm text-muted-foreground">
                          New Owner: <span className="font-mono text-xs">{proposal.newOwner}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {proposal.description}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-green-600">👍 {proposal.votesFor}</div>
                        <div className="text-red-600">👎 {proposal.votesAgainst}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVoteOnProposal(proposal.id, true)}
                        disabled={isVoting}
                        className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        👍 Approve
                      </button>
                      <button
                        onClick={() => handleVoteOnProposal(proposal.id, false)}
                        disabled={isVoting}
                        className="flex-1 bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        👎 Reject
                      </button>
                      <button
                        onClick={() => handleExecuteRecovery(proposal.id)}
                        disabled={isExecutingRecovery}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        ⚡ Execute
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Guardians List */}
            {guardians.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Your Guardians ({guardians.length})</h4>
                <div className="grid gap-3">
                  {guardians.map((guardian) => (
                    <div
                      key={guardian.address}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{guardian.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {guardian.address}
                        </div>
                      </div>
                      <div className="text-green-600 text-sm">
                        ✅ Active
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeProposals.length === 0 && guardians.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-muted-foreground">
                  No active recovery proposals or guardians found.
                  Social recovery may not be configured for your keys.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};