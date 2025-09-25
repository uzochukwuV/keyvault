"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKeyVault } from "@/hooks/useKeyVault";
import { useAccount } from "wagmi";
import { KeyStorageForm } from "./KeyStorageForm";
import { KeyRecoveryPanel } from "./KeyRecoveryPanel";
import { StoredKeysList } from "./StoredKeysList";
import { VaultSettings } from "./VaultSettings";

type DashboardTab = "keys" | "store" | "recover" | "settings";

export const KeyVaultDashboard = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>("keys");
  const { address, isConnected } = useAccount();
  const {
    config,
    keys,
    status,
    progress,
    vaultStats,
    isInitializing,
    initializeVault
  } = useKeyVault();

  const tabConfig = [
    { id: "keys" as const, label: "📋 My Keys", description: "View and manage your stored keys" },
    { id: "store" as const, label: "🔐 Store Key", description: "Securely store a new private key" },
    { id: "recover" as const, label: "🔄 Recovery", description: "Recover keys using backup methods" },
    { id: "settings" as const, label: "⚙️ Settings", description: "Vault configuration and backup settings" },
  ];

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">KeyVault</h2>
        <p className="text-muted-foreground">
          Connect your wallet to access your secure private key vault
        </p>
      </div>
    );
  }

  if (!config?.isInitialized && !isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="text-6xl mb-4">🏗️</div>
        <h2 className="text-2xl font-bold mb-2">Initialize Your KeyVault</h2>
        <p className="text-muted-foreground max-w-lg">
          Set up your secure private key vault with advanced recovery options.
          Your keys will be encrypted and distributed across multiple Filecoin storage providers.
        </p>
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
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Initialize KeyVault
        </motion.button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          🔐 KeyVault Dashboard
        </h1>
        <p className="text-muted-foreground">
          Secure private key management with decentralized backup and recovery
        </p>
      </div>

      {/* Vault Stats */}
      {config?.isInitialized && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{vaultStats.totalKeys}</div>
            <div className="text-sm text-muted-foreground">Total Keys</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{vaultStats.keysWithBoth}</div>
            <div className="text-sm text-muted-foreground">Full Backup</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{vaultStats.keysWithShamir}</div>
            <div className="text-sm text-muted-foreground">Shamir Recovery</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{vaultStats.keysWithSocial}</div>
            <div className="text-sm text-muted-foreground">Social Recovery</div>
          </div>
        </motion.div>
      )}

      {/* Status Display */}
      {(status || progress > 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-accent/50 rounded-lg border border-accent"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{status}</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          {progress > 0 && (
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                className="bg-primary rounded-full h-2"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-lg">
        {tabConfig.map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-fit px-4 py-3 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <div>{tab.label}</div>
            <div className="text-xs opacity-70 hidden md:block">{tab.description}</div>
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[400px]"
        >
          {activeTab === "keys" && <StoredKeysList keys={keys} />}
          {activeTab === "store" && <KeyStorageForm />}
          {activeTab === "recover" && <KeyRecoveryPanel />}
          {activeTab === "settings" && <VaultSettings config={config} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};