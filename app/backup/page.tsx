"use client";

import { CloudDownload as CloudSync, HardDriveDownloadIcon as Hardware, Key, Menu, ShieldCheck, Lock, Upload } from "lucide-react";
import { useAccount } from "wagmi";
import { useKeyVault } from "@/hooks/useKeyVault";
import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";

type KeyType = 'crypto' | 'ssh' | 'api' | 'certificate' | 'other';

export default function Page() {
  const { isConnected } = useAccount();
  const { config, storeKey, isStoringKey, status, progress } = useKeyVault();
  const [step, setStep] = useState<'select' | 'manual' | 'complete'>('select');
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    keyType: 'crypto' as KeyType,
    privateKey: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStoreKey = async () => {
    if (!validateForm()) return;

    try {
      let privateKeyData: Uint8Array;

      if (formData.keyType === 'crypto') {
        const hexKey = formData.privateKey.replace('0x', '');

        // Validate hex format
        if (!/^[0-9a-fA-F]+$/.test(hexKey)) {
          throw new Error('Invalid crypto key format. Expected hexadecimal string.');
        }

        // Ensure even number of hex characters
        if (hexKey.length % 2 !== 0) {
          throw new Error('Invalid crypto key length. Hex string must have even number of characters.');
        }

        try {
          privateKeyData = new Uint8Array(hexKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        } catch (parseError) {
          throw new Error('Failed to parse crypto key. Please check the format.');
        }
      } else {
        privateKeyData = new TextEncoder().encode(formData.privateKey);
      }

      // Additional validation for empty keys
      if (privateKeyData.length === 0) {
        throw new Error('Private key cannot be empty.');
      }

      await storeKey({
        title: formData.title,
        keyType: formData.keyType,
        privateKeyData,
        password: formData.password
      });

      setStep('complete');
    } catch (error) {
      console.error('Failed to store key:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to store key';
      setErrors({ submit: errorMessage });
    }
  };
  if (!isConnected) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--background-light)] text-[var(--text-primary)]">
          <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-sm text-center">
            <Lock className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h2 className="text-3xl font-extrabold tracking-tight">Connect Your Wallet</h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              Connect your wallet to start backing up your private keys securely
            </p>
            <div className="mt-8">
              <ConnectButton />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!config?.isInitialized) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--background-light)] text-[var(--text-primary)]">
          <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-sm text-center">
            <ShieldCheck className="mx-auto h-16 w-16 text-blue-600 mb-6" />
            <h2 className="text-3xl font-extrabold tracking-tight">Initialize Your KeyVault</h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              Set up your secure private key vault before storing keys
            </p>
            <div className="mt-8">
              <button
                onClick={() => router.push('/onboarding')}
                className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 rounded-xl h-14 px-8 bg-[var(--primary-color)] text-white text-lg font-bold shadow-lg shadow-[var(--primary-color)]/30 hover:bg-[var(--primary-hover-color)] transition-all transform hover:scale-105"
              >
                <ShieldCheck size={20} />
                <span>Initialize KeyVault</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--background-light)] text-[var(--text-primary)]">
        <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-sm">

          {/* Step Selection */}
          {step === 'select' && (
            <>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--primary-color)]/10 mb-6">
                  <CloudSync className="text-[var(--primary-color)]" size={36} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Secure Key Backup</h2>
                <p className="mt-4 text-lg text-[var(--text-secondary)]">
                  Choose how to backup your private keys. KeyVault encrypts and stores them on the decentralized Filecoin network.
                </p>
              </div>

              <div className="mt-10 space-y-4">
                <button
                  onClick={() => setStep('manual')}
                  className="w-full flex items-center justify-center gap-4 rounded-xl border-2 border-[var(--border-color)] bg-[var(--background-light)] p-6 transition-all hover:shadow-md hover:border-[var(--primary-color)]/50"
                >
                  <Key size={24} className="text-[var(--primary-color)]" />
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-lg">Manual Key Entry</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Manually enter your private key or seed phrase</p>
                  </div>
                </button>

                <button className="w-full flex items-center justify-center gap-4 rounded-xl border-2 border-[var(--border-color)] bg-[var(--background-light)] p-6 transition-all hover:shadow-md hover:border-[var(--primary-color)]/50 opacity-50 cursor-not-allowed">
                  <Upload size={24} className="text-gray-400" />
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-lg text-gray-400">Import from Wallet (Coming Soon)</h3>
                    <p className="text-sm text-gray-400">Automatically detect and backup keys from connected wallets</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Manual Entry Form */}
          {step === 'manual' && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--primary-color)]/10 mb-6">
                  <Key className="text-[var(--primary-color)]" size={36} />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">Enter Your Private Key</h2>
                <p className="mt-4 text-lg text-[var(--text-secondary)]">
                  Your key will be encrypted with your password before being stored securely
                </p>
              </div>

              {/* Status Display */}
              {(status || progress > 0) && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800">{status}</span>
                    <span className="text-sm text-blue-600">{progress}%</span>
                  </div>
                  {progress > 0 && (
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 rounded-full h-2 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Key Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., My Main Wallet"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Key Type</label>
                  <select
                    value={formData.keyType}
                    onChange={(e) => setFormData(prev => ({ ...prev, keyType: e.target.value as KeyType }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="crypto">Crypto Wallet</option>
                    <option value="ssh">SSH Key</option>
                    <option value="api">API Key</option>
                    <option value="certificate">Certificate</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Private Key</label>
                  <textarea
                    value={formData.privateKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, privateKey: e.target.value }))}
                    placeholder="Enter your private key here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[100px] font-mono text-sm"
                  />
                  {errors.privateKey && <p className="text-red-500 text-sm mt-1">{errors.privateKey}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Encryption Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Strong password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                {errors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{errors.submit}</p>
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    onClick={() => setStep('select')}
                    className="flex-1 py-3 px-6 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStoreKey}
                    disabled={isStoringKey}
                    className="flex-1 py-3 px-6 bg-[var(--primary-color)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover-color)] disabled:opacity-50 transition-colors"
                  >
                    {isStoringKey ? 'Storing...' : 'Store Securely'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Success */}
          {step === 'complete' && (
            <>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                  <ShieldCheck className="text-green-600" size={36} />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">Key Stored Successfully!</h2>
                <p className="mt-4 text-lg text-[var(--text-secondary)]">
                  Your private key has been encrypted and securely distributed across multiple Filecoin storage providers.
                </p>
              </div>

              <div className="mt-10 flex space-x-4">
                <button
                  onClick={() => {
                    setStep('select');
                    setFormData({
                      title: '',
                      keyType: 'crypto',
                      privateKey: '',
                      password: '',
                      confirmPassword: ''
                    });
                    setErrors({});
                  }}
                  className="flex-1 py-3 px-6 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Store Another Key
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 py-3 px-6 bg-[var(--primary-color)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover-color)] transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}


