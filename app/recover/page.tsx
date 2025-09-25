"use client";

import { Fingerprint, Group, Settings, Key, Users, RefreshCw, Lock, Search, Upload } from "lucide-react";
import { useAccount } from "wagmi";
import { useKeyVault } from "@/hooks/useKeyVault";
import { useShamirRecovery } from "@/hooks/useShamirRecovery";
import { useSocialRecovery } from "@/hooks/useSocialRecovery";
import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";

type RecoveryMethod = 'shamir' | 'social';
type RecoveryStep = 'select' | 'shamir-shares' | 'social-vote' | 'complete';

export default function Page() {
  const { isConnected } = useAccount();
  const { config, keys } = useKeyVault();
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

  const [selectedMethod, setSelectedMethod] = useState<RecoveryMethod | null>(null);
  const [step, setStep] = useState<RecoveryStep>('select');
  const [shareData, setShareData] = useState("");
  const [shareIndex, setShareIndex] = useState("");
  const [recoveredKey, setRecoveredKey] = useState<Uint8Array | null>(null);
  const router = useRouter();

  const handleSubmitShare = async () => {
    if (!shareData.trim() || !shareIndex.trim()) {
      alert('Please enter both share data and share index.');
      return;
    }

    const shareIndexNum = parseInt(shareIndex);
    if (isNaN(shareIndexNum) || shareIndexNum < 1) {
      alert('Share index must be a positive number.');
      return;
    }

    try {
      // Basic validation for share data format
      if (shareData.trim().length < 10) {
        throw new Error('Share data appears too short. Please verify the complete share.');
      }

      await submitShare({
        shareData: shareData.trim(),
        shareIndex: shareIndexNum
      });
      setShareData("");
      setShareIndex("");
    } catch (error) {
      console.error('Failed to submit share:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit share';
      alert('Failed to submit share: ' + errorMessage);
    }
  };

  const handleReconstructKey = async () => {
    try {
      const reconstructedKey = await reconstructKey();
      setRecoveredKey(reconstructedKey);
      setStep('complete');
    } catch (error) {
      console.error('Failed to reconstruct key:', error);
      alert('Failed to reconstruct key: ' + (error as Error).message);
    }
  };

  const handleVoteOnProposal = async (proposalId: string, vote: boolean) => {
    if (!proposalId) {
      alert('Invalid proposal ID.');
      return;
    }

    const reason = prompt(`Reason for ${vote ? 'approving' : 'rejecting'} this recovery:`);
    if (reason === null) {
      // User cancelled, don't proceed
      return;
    }

    try {
      await voteOnProposal({
        proposalId,
        vote,
        reason: reason.trim() || undefined
      });
    } catch (error) {
      console.error('Failed to vote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to vote';
      alert('Failed to vote: ' + errorMessage);
    }
  };
  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 text-gray-800">
        <main className="container mx-auto flex-grow px-6 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <Lock className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h2 className="text-4xl font-extrabold tracking-tight text-gray-900">Connect Your Wallet</h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Connect your wallet to access key recovery options
            </p>
            <div className="mt-8">
              <ConnectButton />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const recoverableKeys = keys.filter(key => key.hasSharedShares || key.hasSocialBackup);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-800">
      <main className="container mx-auto flex-grow px-6 py-12">
        <div className="mx-auto max-w-4xl">

          {/* Method Selection */}
          {step === 'select' && (
            <>
              <div className="mb-12 text-center">
                <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">Key Recovery</h2>
                <p className="mt-4 text-lg leading-8 text-gray-600">
                  Recover your private keys using Shamir Secret Sharing or Social Recovery methods
                </p>
                {recoverableKeys.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    {recoverableKeys.length} key{recoverableKeys.length !== 1 ? 's' : ''} available for recovery
                  </p>
                )}
              </div>

              {recoverableKeys.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="mx-auto h-16 w-16 text-gray-400 mb-6" />
                  <h3 className="text-xl font-semibold mb-2">No Recovery Options Available</h3>
                  <p className="text-gray-600 mb-6">
                    You don't have any keys with recovery methods enabled.
                  </p>
                  <button
                    onClick={() => router.push('/backup')}
                    className="inline-flex items-center gap-2 rounded-md bg-[var(--primary-color)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover-color)] transition-colors"
                  >
                    <Key size={18} />
                    Store a Key with Recovery
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div
                    onClick={() => {
                      setSelectedMethod('shamir');
                      setStep('shamir-shares');
                    }}
                    className="flex flex-col rounded-lg border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg cursor-pointer hover:border-[var(--primary-color)]/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <RefreshCw className="text-[var(--primary-color)]" size={28} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Shamir Secret Sharing</h3>
                    </div>
                    <p className="mt-4 flex-grow text-base text-gray-600">
                      Reconstruct your private key by collecting the minimum required shares from distributed storage locations.
                    </p>
                    <div className="mt-8">
                      <div className="flex w-full items-center justify-center gap-2 rounded-md h-11 px-6 bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-sm font-bold">
                        <Settings size={18} />
                        <span className="truncate">Start Shamir Recovery</span>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Keys with Shamir backup: {keys.filter(k => k.hasSharedShares).length}
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedMethod('social');
                      setStep('social-vote');
                    }}
                    className="flex flex-col rounded-lg border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg cursor-pointer hover:border-[var(--primary-color)]/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <Group className="text-[var(--primary-color)]" size={28} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Social Recovery</h3>
                    </div>
                    <p className="mt-4 flex-grow text-base text-gray-600">
                      Recover access through trusted guardians who can vote on recovery proposals.
                    </p>
                    <div className="mt-8">
                      <div className="flex w-full items-center justify-center gap-2 rounded-md h-11 px-6 bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-sm font-bold">
                        <Settings size={18} />
                        <span className="truncate">Start Social Recovery</span>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Keys with social backup: {keys.filter(k => k.hasSocialBackup).length}
                      <br />
                      Active guardians: {guardians.length}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Shamir Recovery Process */}
          {step === 'shamir-shares' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 mx-auto mb-6">
                  <RefreshCw className="text-purple-600" size={32} />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Shamir Recovery Process</h2>
                <p className="mt-4 text-lg text-gray-600">
                  Submit your recovery shares to reconstruct your private key
                </p>
              </div>

              {/* Status Display */}
              {(shamirStatus || shamirProgress > 0) && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800">{shamirStatus}</span>
                    <span className="text-sm text-blue-600">{shamirProgress}%</span>
                  </div>
                  {shamirProgress > 0 && (
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 rounded-full h-2 transition-all duration-500"
                        style={{ width: `${shamirProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Recovery Attempt Info */}
              {shamirAttempt.id && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Active Recovery Session</h4>
                  <div className="text-sm space-y-1">
                    <div>Session ID: <span className="font-mono text-xs">{shamirAttempt.id}</span></div>
                    <div>Collected Shares: {shamirAttempt.collectedShares.length} / {shamirAttempt.requiredShares}</div>
                    <div>Status: {shamirAttempt.isComplete ? '✅ Ready for reconstruction' : '⏳ Collecting shares'}</div>
                  </div>
                </div>
              )}

              {/* Share Submission */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h4 className="font-semibold mb-4">Submit Recovery Share</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Share Index</label>
                    <input
                      type="number"
                      min="1"
                      value={shareIndex}
                      onChange={(e) => setShareIndex(e.target.value)}
                      placeholder="Enter share index (1-N)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Share Data</label>
                    <textarea
                      value={shareData}
                      onChange={(e) => setShareData(e.target.value)}
                      placeholder="Paste your recovery share data here..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[100px] font-mono text-sm"
                    />
                  </div>

                  <button
                    onClick={handleSubmitShare}
                    disabled={!shareData.trim() || !shareIndex.trim() || isSubmittingShare}
                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingShare ? "🔄 Submitting Share..." : "📤 Submit Share"}
                  </button>
                </div>
              </div>

              {/* Reconstruction Button */}
              {shamirAttempt.isComplete && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h4 className="font-semibold text-green-800 mb-4">✅ Ready for Key Reconstruction</h4>
                  <p className="text-sm text-green-700 mb-4">
                    You have collected enough shares to reconstruct your private key.
                  </p>
                  <button
                    onClick={handleReconstructKey}
                    disabled={isReconstructing}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {isReconstructing ? "🔄 Reconstructing..." : "🔧 Reconstruct Private Key"}
                  </button>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={() => setStep('select')}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ← Back to Recovery Options
                </button>
              </div>
            </div>
          )}

          {/* Social Recovery Process */}
          {step === 'social-vote' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 mx-auto mb-6">
                  <Group className="text-orange-600" size={32} />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Social Recovery Process</h2>
                <p className="mt-4 text-lg text-gray-600">
                  Vote on recovery proposals or execute approved recoveries
                </p>
              </div>

              {/* Status Display */}
              {(socialStatus || socialProgress > 0) && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800">{socialStatus}</span>
                    <span className="text-sm text-blue-600">{socialProgress}%</span>
                  </div>
                  {socialProgress > 0 && (
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 rounded-full h-2 transition-all duration-500"
                        style={{ width: `${socialProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Active Proposals */}
              {activeProposals.length > 0 ? (
                <div className="space-y-6 mb-8">
                  <h4 className="font-semibold text-lg">Active Recovery Proposals</h4>
                  {activeProposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="font-medium">Recovery Proposal</div>
                          <div className="text-sm text-gray-600">
                            New Owner: <span className="font-mono text-xs">{proposal.newOwner}</span>
                          </div>
                          <div className="text-sm text-gray-600">{proposal.description}</div>
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
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center mb-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">No active recovery proposals found.</p>
                </div>
              )}

              {/* Guardians List */}
              {guardians.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
                  <h4 className="font-semibold mb-4">Your Guardians ({guardians.length})</h4>
                  <div className="space-y-3">
                    {guardians.map((guardian) => (
                      <div
                        key={guardian.address}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{guardian.name}</div>
                          <div className="text-sm text-gray-500 font-mono">{guardian.address}</div>
                        </div>
                        <div className="text-green-600 text-sm">✅ Active</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={() => setStep('select')}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  ← Back to Recovery Options
                </button>
              </div>
            </div>
          )}

          {/* Recovery Complete */}
          {step === 'complete' && recoveredKey && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-6">
                <Key className="text-green-600" size={32} />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-4">Recovery Successful!</h2>
              <p className="text-lg text-gray-600 mb-8">
                Your private key has been successfully reconstructed.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <h4 className="font-semibold text-green-800 mb-4">⚠️ Important Security Notice</h4>
                <p className="text-sm text-green-700">
                  Your recovered private key is now displayed. Make sure to copy it to a secure location and never share it with anyone.
                  Consider storing it in a new KeyVault for additional security.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/backup')}
                  className="flex-1 bg-[var(--primary-color)] text-white py-3 px-6 rounded-lg hover:bg-[var(--primary-hover-color)] transition-colors"
                >
                  Store in New KeyVault
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


