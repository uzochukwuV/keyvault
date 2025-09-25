"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKeyVault, type KeyRecord } from "@/hooks/useKeyVault";

interface StoredKeysListProps {
  keys: KeyRecord[];
}

const getKeyTypeIcon = (keyType: KeyRecord['keyType']) => {
  switch (keyType) {
    case 'crypto': return '₿';
    case 'ssh': return '🔑';
    case 'api': return '🔗';
    case 'certificate': return '📜';
    default: return '📄';
  }
};

const getKeyTypeLabel = (keyType: KeyRecord['keyType']) => {
  switch (keyType) {
    case 'crypto': return 'Crypto Wallet';
    case 'ssh': return 'SSH Key';
    case 'api': return 'API Key';
    case 'certificate': return 'Certificate';
    default: return 'Other';
  }
};

const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

export const StoredKeysList = ({ keys }: StoredKeysListProps) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showRetrievalForm, setShowRetrievalForm] = useState(false);
  const [retrievedKey, setRetrievedKey] = useState<{ keyId: string; privateKey: Uint8Array } | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const { retrieveKey, isRetrievingKey, initiateRecovery, isInitiatingRecovery } = useKeyVault();

  const handleRetrieveKey = async () => {
    if (!selectedKey || !password) return;

    try {
      const result = await retrieveKey({ keyId: selectedKey, password });
      setRetrievedKey(result);
      setShowRetrievalForm(false);
      setPassword("");
      setSelectedKey(null);
    } catch (error) {
      console.error('Failed to retrieve key:', error);
      alert('Failed to retrieve key: ' + (error as Error).message);
    }
  };

  const handleStartRecovery = async (keyId: string, method: 'shamir' | 'social') => {
    try {
      await initiateRecovery({
        keyId,
        recoveryMethod: method,
        newOwner: method === 'social' ? prompt('Enter new owner address for social recovery:') : undefined
      });
    } catch (error) {
      console.error('Failed to start recovery:', error);
      alert('Failed to start recovery: ' + (error as Error).message);
    }
  };

  const formatPrivateKey = (keyData: Uint8Array, keyType: KeyRecord['keyType']) => {
    if (keyType === 'crypto') {
      // Convert bytes back to hex string for crypto keys
      return '0x' + Array.from(keyData).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Convert bytes back to string for other key types
      return new TextDecoder().decode(keyData);
    }
  };

  if (keys.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-semibold mb-2">No Keys Stored</h3>
        <p className="text-muted-foreground mb-6">
          You haven't stored any private keys yet. Get started by storing your first key.
        </p>
        <p className="text-sm text-muted-foreground">
          Your keys will be encrypted and securely distributed across multiple Filecoin storage providers.
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
        <h2 className="text-2xl font-bold">📋 Your Stored Keys</h2>
        <p className="text-muted-foreground">
          {keys.length} key{keys.length !== 1 ? 's' : ''} securely stored with backup and recovery options
        </p>
      </div>

      {/* Retrieved Key Display */}
      <AnimatePresence>
        {retrievedKey && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                ✅ Key Retrieved Successfully
              </h3>
              <button
                onClick={() => setRetrievedKey(null)}
                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  Private Key
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={showPrivateKey ?
                      formatPrivateKey(retrievedKey.privateKey, keys.find(k => k.id === retrievedKey.keyId)?.keyType || 'other') :
                      '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded font-mono text-sm min-h-[80px]"
                  />
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="absolute top-2 right-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 text-sm"
                  >
                    {showPrivateKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const keyData = formatPrivateKey(retrievedKey.privateKey, keys.find(k => k.id === retrievedKey.keyId)?.keyType || 'other');
                    navigator.clipboard.writeText(keyData);
                    alert('Private key copied to clipboard!');
                  }}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([formatPrivateKey(retrievedKey.privateKey, keys.find(k => k.id === retrievedKey.keyId)?.keyType || 'other')], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `private-key-${retrievedKey.keyId}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  💾 Download
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys List */}
      <div className="grid gap-4">
        {keys.map((key) => (
          <motion.div
            key={key.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="border border-border rounded-lg p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="text-3xl">{getKeyTypeIcon(key.keyType)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-lg">{key.title}</h3>
                    <span className="text-xs px-2 py-1 bg-muted rounded-full">
                      {getKeyTypeLabel(key.keyType)}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Created: {formatTimestamp(key.timestamp)}</div>
                    <div>Version: {key.version}</div>
                    <div>Filecoin CID: <span className="font-mono text-xs">{key.masterCid}</span></div>
                  </div>

                  <div className="flex items-center space-x-4 mt-3">
                    {key.hasSharedShares && (
                      <span className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                        <span>🔀</span>
                        <span>Shamir Backup</span>
                      </span>
                    )}
                    {key.hasSocialBackup && (
                      <span className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                        <span>👥</span>
                        <span>Social Recovery</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => {
                    setSelectedKey(key.id);
                    setShowRetrievalForm(true);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors"
                >
                  🔓 Retrieve
                </button>

                {key.hasSharedShares && (
                  <button
                    onClick={() => handleStartRecovery(key.id, 'shamir')}
                    disabled={isInitiatingRecovery}
                    className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    🔀 Shamir Recovery
                  </button>
                )}

                {key.hasSocialBackup && (
                  <button
                    onClick={() => handleStartRecovery(key.id, 'social')}
                    disabled={isInitiatingRecovery}
                    className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    👥 Social Recovery
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Key Retrieval Modal */}
      <AnimatePresence>
        {showRetrievalForm && selectedKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowRetrievalForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">🔓 Retrieve Private Key</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Enter your encryption password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Encryption password"
                    className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleRetrieveKey()}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleRetrieveKey}
                    disabled={!password || isRetrievingKey}
                    className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {isRetrievingKey ? "🔄 Retrieving..." : "🔓 Retrieve Key"}
                  </button>
                  <button
                    onClick={() => {
                      setShowRetrievalForm(false);
                      setPassword("");
                      setSelectedKey(null);
                    }}
                    className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};