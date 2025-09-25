"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useKeyVault, type KeyRecord } from "@/hooks/useKeyVault";

type KeyType = KeyRecord['keyType'];

const keyTypeOptions: { value: KeyType; label: string; icon: string; description: string }[] = [
  { value: 'crypto', label: 'Crypto Wallet', icon: '₿', description: 'Cryptocurrency private keys' },
  { value: 'ssh', label: 'SSH Key', icon: '🔑', description: 'Server access keys' },
  { value: 'api', label: 'API Key', icon: '🔗', description: 'Service API credentials' },
  { value: 'certificate', label: 'Certificate', icon: '📜', description: 'SSL/TLS certificates' },
  { value: 'other', label: 'Other', icon: '📄', description: 'Other sensitive data' },
];

export const KeyStorageForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    keyType: 'crypto' as KeyType,
    privateKey: '',
    password: '',
    confirmPassword: ''
  });
  const [showKey, setShowKey] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { storeKey, isStoringKey } = useKeyVault();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.privateKey.trim()) {
      newErrors.privateKey = 'Private key is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Validate private key format based on key type
    if (formData.privateKey && formData.keyType === 'crypto') {
      const isHex = /^[0-9a-fA-F]+$/.test(formData.privateKey.replace('0x', ''));
      if (!isHex || formData.privateKey.replace('0x', '').length !== 64) {
        newErrors.privateKey = 'Invalid crypto private key format (should be 64 hex characters)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Convert private key to Uint8Array
      let privateKeyData: Uint8Array;

      if (formData.keyType === 'crypto') {
        // Remove 0x prefix if present and convert hex to bytes
        const hexKey = formData.privateKey.replace('0x', '');
        privateKeyData = new Uint8Array(hexKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      } else {
        // For other key types, convert string to UTF-8 bytes
        privateKeyData = new TextEncoder().encode(formData.privateKey);
      }

      await storeKey({
        title: formData.title,
        keyType: formData.keyType,
        privateKeyData,
        password: formData.password
      });

      // Reset form on success
      setFormData({
        title: '',
        keyType: 'crypto',
        privateKey: '',
        password: '',
        confirmPassword: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to store key:', error);
      setErrors({ submit: (error as Error).message || 'Failed to store key' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">🔐 Store New Private Key</h2>
        <p className="text-muted-foreground">
          Securely encrypt and distribute your private key across multiple Filecoin storage providers
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Key Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., My Main Wallet, Production SSH Key"
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title}</p>
          )}
        </div>

        {/* Key Type */}
        <div>
          <label className="block text-sm font-medium mb-3">Key Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {keyTypeOptions.map((option) => (
              <motion.label
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.keyType === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="keyType"
                  value={option.value}
                  checked={formData.keyType === option.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, keyType: e.target.value as KeyType }))}
                  className="sr-only"
                />
                <div className="flex items-start space-x-3 w-full">
                  <div className="text-2xl">{option.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {option.description}
                    </div>
                  </div>
                </div>
              </motion.label>
            ))}
          </div>
        </div>

        {/* Private Key */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Private Key</label>
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
          <textarea
            value={formData.privateKey}
            onChange={(e) => setFormData(prev => ({ ...prev, privateKey: e.target.value }))}
            type={showKey ? "text" : "password"}
            placeholder={formData.keyType === 'crypto' ? "Enter your private key (64 hex characters)" : "Enter your private key or sensitive data"}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px] font-mono text-sm"
            style={{ fontFamily: 'monospace' }}
          />
          {errors.privateKey && (
            <p className="text-red-500 text-sm mt-1">{errors.privateKey}</p>
          )}
        </div>

        {/* Encryption Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Encryption Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Strong password for encryption"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm your password"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-600 dark:text-yellow-400 text-xl">⚠️</div>
            <div className="text-sm">
              <strong>Security Notice:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Your private key will be encrypted with your password before storage</li>
                <li>• Keys are distributed across multiple Filecoin storage providers for redundancy</li>
                <li>• Shamir Secret Sharing and Social Recovery will be configured automatically</li>
                <li>• Store your password safely - it cannot be recovered if lost</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isStoringKey}
          className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isStoringKey ? "🔄 Storing Key Securely..." : "🔐 Store Key Securely"}
        </motion.button>
      </form>
    </motion.div>
  );
};