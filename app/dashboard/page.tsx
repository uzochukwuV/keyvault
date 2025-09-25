"use client";

import { Bell, Check, Play, Plus, PlusSquare, RefreshCw, ShieldCheck, Wallet, Key, Lock, Users } from "lucide-react";
import { useAccount } from "wagmi";
import { useKeyVault } from "@/hooks/useKeyVault";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Page() {
  const { address, isConnected } = useAccount();
  const { config, keys, vaultStats, isInitializing, initializeVault } = useKeyVault();
  const router = useRouter();
  return (
    <div className="relative flex size-full flex-col group/design-root overflow-x-hidden" style={{ fontFamily: 'Manrope, "Noto Sans", sans-serif' }}>
      <div className="layout-container flex h-full grow flex-col">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[var(--text-primary)] text-3xl font-bold leading-tight tracking-tight">🔐 KeyVault Dashboard</h1>
                  <p className="text-gray-500 mt-1">Secure private key management with decentralized backup and recovery</p>
                </div>
                {!isConnected && (
                  <ConnectButton />
                )}
              </div>
            </div>

            {!isConnected ? (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 text-center">
                <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
                <p className="text-gray-500 mb-4">Connect your wallet to access your KeyVault dashboard and manage your private keys securely.</p>
                <ConnectButton />
              </div>
            ) : !config?.isInitialized ? (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 text-center">
                <Key className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Initialize Your KeyVault</h3>
                <p className="text-gray-500 mb-4">Set up your secure private key vault with advanced recovery options.</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => initializeVault({
                    recoveryMethod: 'both',
                    backupStrategy: {
                      useLocalStorage: false,
                      useFilecoinPrimary: true,
                      useShamirSharing: true,
                      useSocialRecovery: true,
                      redundancyLevel: 'standard'
                    }
                  })}
                  disabled={isInitializing}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isInitializing ? "Initializing..." : "Initialize KeyVault"}
                </motion.button>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="flex flex-col gap-2 rounded-lg p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <Key className="text-blue-500" size={20} />
                  <p className="text-gray-600 text-base font-medium leading-normal">Total Keys</p>
                </div>
                <p className="text-[var(--text-primary)] text-4xl font-bold leading-tight">{vaultStats.totalKeys}</p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-green-500" size={20} />
                  <p className="text-gray-600 text-base font-medium leading-normal">Full Backup</p>
                </div>
                <p className="text-[var(--text-primary)] text-4xl font-bold leading-tight">{vaultStats.keysWithBoth}</p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <RefreshCw className="text-purple-500" size={20} />
                  <p className="text-gray-600 text-base font-medium leading-normal">Shamir Recovery</p>
                </div>
                <p className="text-[var(--text-primary)] text-4xl font-bold leading-tight">{vaultStats.keysWithShamir}</p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <Users className="text-orange-500" size={20} />
                  <p className="text-gray-600 text-base font-medium leading-normal">Social Recovery</p>
                </div>
                <p className="text-[var(--text-primary)] text-4xl font-bold leading-tight">{vaultStats.keysWithSocial}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-8">
              <h2 className="text-[var(--text-primary)] text-xl font-bold leading-tight tracking-[-0.015em] mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => router.push('/backup')}
                  className="flex min-w-[84px] items-center justify-center gap-2 rounded-md h-10 px-4 bg-[var(--primary-color)] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors"
                >
                  <Key size={18} />
                  <span className="truncate">Store New Key</span>
                </button>
                <button
                  onClick={() => router.push('/recover')}
                  className="flex min-w-[84px] items-center justify-center gap-2 rounded-md h-10 px-4 bg-gray-100 text-[var(--text-primary)] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw size={18} />
                  <span className="truncate">Recover Keys</span>
                </button>
                <button
                  onClick={() => router.push('/onboarding')}
                  className="flex min-w-[84px] items-center justify-center gap-2 rounded-md h-10 px-4 bg-gray-100 text-[var(--text-primary)] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors"
                >
                  <ShieldCheck size={18} />
                  <span className="truncate">Setup Recovery</span>
                </button>
              </div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
              <h2 className="text-[var(--text-primary)] text-xl font-bold leading-tight tracking-[-0.015em] mb-6">Recent Activity</h2>
              <div className="flow-root">
                <ul className="-mb-8">
                  {keys.length > 0 ? (
                    keys.slice(0, 3).map((key, index) => (
                      <li key={key.id}>
                        <div className={`relative ${index < keys.length - 1 ? 'pb-8' : 'pb-0'}`}>
                          {index < keys.length - 1 && (
                            <span aria-hidden="true" className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                          )}
                          <div className="relative flex space-x-4 items-start">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-white">
                                <Key className="text-green-600" size={18} />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5">
                              <p className="text-sm text-gray-800 font-medium">Key Stored: {key.title}</p>
                              <p className="text-sm text-gray-500">{new Date(key.timestamp).toLocaleDateString()}</p>
                              <div className="flex gap-2 mt-1">
                                {key.hasSharedShares && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Shamir
                                  </span>
                                )}
                                {key.hasSocialBackup && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    Social
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li>
                      <div className="text-center py-8">
                        <Key className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No keys stored yet</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
                </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


