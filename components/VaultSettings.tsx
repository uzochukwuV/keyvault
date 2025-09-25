"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useKeyVault, type KeyVaultConfig } from "@/hooks/useKeyVault";
import { useSocialRecovery } from "@/hooks/useSocialRecovery";

interface VaultSettingsProps {
  config: KeyVaultConfig | null;
}

export const VaultSettings = ({ config }: VaultSettingsProps) => {
  const [guardianForm, setGuardianForm] = useState({
    address: '',
    name: '',
    email: ''
  });

  const { shamirRecovery, socialRecovery, storage } = useKeyVault();
  const {
    guardians,
    addGuardian,
    removeGuardian,
    isAddingGuardian,
    isRemovingGuardian
  } = useSocialRecovery();

  const handleAddGuardian = async () => {
    if (!guardianForm.address.trim() || !guardianForm.name.trim()) return;

    try {
      await addGuardian({
        guardianAddress: guardianForm.address.trim(),
        guardianName: guardianForm.name.trim(),
        guardianEmail: guardianForm.email.trim() || undefined,
        encryptedRecoveryData: 'placeholder_recovery_data' // This would be actual encrypted data
      });

      setGuardianForm({ address: '', name: '', email: '' });
    } catch (error) {
      console.error('Failed to add guardian:', error);
      alert('Failed to add guardian: ' + (error as Error).message);
    }
  };

  const handleRemoveGuardian = async (guardianAddress: string) => {
    if (!confirm('Are you sure you want to remove this guardian?')) return;

    try {
      await removeGuardian({ guardianAddress });
    } catch (error) {
      console.error('Failed to remove guardian:', error);
      alert('Failed to remove guardian: ' + (error as Error).message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">⚙️ Vault Settings</h2>
        <p className="text-muted-foreground">
          Configure your KeyVault security settings and recovery methods
        </p>
      </div>

      {/* Vault Configuration */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">🏗️ Vault Configuration</h3>

        {config ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Owner</label>
              <div className="font-mono text-sm bg-muted p-2 rounded">
                {config.owner}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Recovery Method</label>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                  {config.recoveryMethod}
                </span>
                {config.recoveryMethod === 'both' && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      Maximum security with dual recovery
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <div className="text-sm">
                {new Date(config.createdAt).toLocaleString()}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-sm">Active & Initialized</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Vault not initialized</p>
        )}
      </div>

      {/* Shamir Secret Sharing Settings */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">🔀 Shamir Secret Sharing</h3>

        {shamirRecovery.config ? (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {shamirRecovery.config.threshold}
              </div>
              <div className="text-sm text-muted-foreground">Threshold (M)</div>
              <div className="text-xs text-muted-foreground mt-1">
                Minimum shares needed
              </div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {shamirRecovery.config.totalShares}
              </div>
              <div className="text-sm text-muted-foreground">Total Shares (N)</div>
              <div className="text-xs text-muted-foreground mt-1">
                Total shares created
              </div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {shamirRecovery.shareDistribution.filter(s => s.status === 'stored').length}
              </div>
              <div className="text-sm text-muted-foreground">Stored</div>
              <div className="text-xs text-muted-foreground mt-1">
                Successfully distributed
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">Shamir Secret Sharing not configured</p>
        )}

        {shamirRecovery.shareDistribution.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Share Distribution</h4>
            <div className="space-y-2">
              {shamirRecovery.shareDistribution.map((dist, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                  <span>Share {dist.share.x}: {dist.provider.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    dist.status === 'stored' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    dist.status === 'uploading' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {dist.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Social Recovery Settings */}
      <div className="border border-border rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-semibold">👥 Social Recovery</h3>

        {/* Guardian Management */}
        <div className="space-y-4">
          <h4 className="font-medium">Add Guardian</h4>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Guardian Address</label>
              <input
                type="text"
                value={guardianForm.address}
                onChange={(e) => setGuardianForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Guardian Name</label>
              <input
                type="text"
                value={guardianForm.name}
                onChange={(e) => setGuardianForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email (Optional)</label>
              <input
                type="email"
                value={guardianForm.email}
                onChange={(e) => setGuardianForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleAddGuardian}
            disabled={!guardianForm.address.trim() || !guardianForm.name.trim() || isAddingGuardian}
            className="w-full md:w-auto bg-primary text-primary-foreground py-2 px-6 rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isAddingGuardian ? "🔄 Adding Guardian..." : "👥 Add Guardian"}
          </button>
        </div>

        {/* Guardians List */}
        {guardians.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Current Guardians ({guardians.length})</h4>
            <div className="space-y-3">
              {guardians.map((guardian) => (
                <div
                  key={guardian.address}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{guardian.name}</div>
                    <div className="text-sm text-muted-foreground font-mono truncate">
                      {guardian.address}
                    </div>
                    {guardian.email && (
                      <div className="text-sm text-muted-foreground">
                        {guardian.email}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      Added {new Date(guardian.addedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400 text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>Active</span>
                    </div>

                    <button
                      onClick={() => handleRemoveGuardian(guardian.address)}
                      disabled={isRemovingGuardian}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {guardians.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <div className="text-3xl mb-2">👥</div>
            <p>No guardians configured</p>
            <p className="text-sm">Add trusted contacts who can help recover your keys</p>
          </div>
        )}
      </div>

      {/* Storage Settings */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold">☁️ Storage Settings</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium">Redundancy Configuration</h4>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>Minimum Replicas:</span>
                <span className="font-mono">{storage.redundancyConfig.minReplicas}</span>
              </div>
              <div className="flex justify-between">
                <span>Maximum Replicas:</span>
                <span className="font-mono">{storage.redundancyConfig.maxReplicas}</span>
              </div>
              <div className="flex justify-between">
                <span>Renewal Window:</span>
                <span className="font-mono">{Math.round(storage.redundancyConfig.renewalWindow / (24 * 60 * 60))} days</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Provider Statistics</h4>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>Available Providers:</span>
                <span className="font-mono">{storage.providers.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Storage:</span>
                <span className="font-mono">{storage.isStoring ? 'In Progress' : 'Idle'}</span>
              </div>
              <div className="flex justify-between">
                <span>Storage Status:</span>
                <span className="text-green-600">Healthy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4">
          🛡️ Security Recommendations
        </h3>
        <div className="space-y-3 text-sm text-yellow-700 dark:text-yellow-300">
          <div className="flex items-start space-x-2">
            <span>•</span>
            <span>Add at least 3-5 trusted guardians for social recovery</span>
          </div>
          <div className="flex items-start space-x-2">
            <span>•</span>
            <span>Use unique, strong passwords for each key encryption</span>
          </div>
          <div className="flex items-start space-x-2">
            <span>•</span>
            <span>Regularly test your recovery methods</span>
          </div>
          <div className="flex items-start space-x-2">
            <span>•</span>
            <span>Keep backup copies of your Shamir shares offline</span>
          </div>
          <div className="flex items-start space-x-2">
            <span>•</span>
            <span>Monitor storage deals and renew before expiration</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};