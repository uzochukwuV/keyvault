"use client";
import { Lock, Shield, Users, Key, Check, ArrowRight } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useKeyVault } from "@/hooks/useKeyVault";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const { isConnected } = useAccount();
  const { config, initializeVault, isInitializing } = useKeyVault();
  const [selectedMethod, setSelectedMethod] = useState<'shamir' | 'social' | 'both'>('both');
  const [step, setStep] = useState<'welcome' | 'setup' | 'complete'>('welcome');
  const router = useRouter();
  const handleInitialize = async () => {
    try {
      await initializeVault({
        recoveryMethod: selectedMethod,
        backupStrategy: {
          useLocalStorage: false,
          useFilecoinPrimary: true,
          useShamirSharing: selectedMethod === 'shamir' || selectedMethod === 'both',
          useSocialRecovery: selectedMethod === 'social' || selectedMethod === 'both',
          redundancyLevel: 'standard'
        }
      });
      setStep('complete');
    } catch (error) {
      console.error('Failed to initialize vault:', error);
    }
  };

  if (config?.isInitialized) {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl text-center">
        {step === 'welcome' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <Lock className="text-red-600" size={40} />
            </div>
            <h1 className="mt-8 text-4xl font-extrabold tracking-tighter text-gray-900 sm:text-5xl">KeyVault</h1>
            <p className="mt-4 text-lg text-gray-600">
              Your digital fortress for crypto assets. Securely back up your wallet, seed phrases, and private keys with military-grade encryption.
            </p>

            {/* Features */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Shield className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-medium text-gray-900">End-to-End Encryption</h3>
                <p className="text-sm text-gray-500 mt-1">Military-grade encryption protects your keys</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Users className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-medium text-gray-900">Social Recovery</h3>
                <p className="text-sm text-gray-500 mt-1">Trusted guardians help recover access</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Key className="mx-auto h-8 w-8 text-purple-600 mb-2" />
                <h3 className="font-medium text-gray-900">Secret Sharing</h3>
                <p className="text-sm text-gray-500 mt-1">Split keys across multiple locations</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center space-y-4">
              {isConnected ? (
                <button
                  onClick={() => setStep('setup')}
                  className="flex items-center gap-2 rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Get Started
                  <ArrowRight size={16} />
                </button>
              ) : (
                <ConnectButton />
              )}
            </div>
          </>
        )}

        {step === 'setup' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <Shield className="text-blue-600" size={40} />
            </div>
            <h2 className="mt-8 text-3xl font-extrabold tracking-tighter text-gray-900">Choose Your Security Level</h2>
            <p className="mt-4 text-lg text-gray-600">
              Select how you want to secure and recover your private keys
            </p>

            <div className="mt-8 space-y-4">
              <div
                onClick={() => setSelectedMethod('shamir')}
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMethod === 'shamir'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Key className="h-6 w-6 text-purple-600" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Shamir Secret Sharing Only</h3>
                      <p className="text-sm text-gray-500">Split keys mathematically across multiple storage providers</p>
                    </div>
                  </div>
                  {selectedMethod === 'shamir' && <Check className="h-5 w-5 text-purple-600" />}
                </div>
              </div>

              <div
                onClick={() => setSelectedMethod('social')}
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMethod === 'social'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 text-green-600" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Social Recovery Only</h3>
                      <p className="text-sm text-gray-500">Trusted guardians help you recover access to your keys</p>
                    </div>
                  </div>
                  {selectedMethod === 'social' && <Check className="h-5 w-5 text-green-600" />}
                </div>
              </div>

              <div
                onClick={() => setSelectedMethod('both')}
                className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMethod === 'both'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-6 w-6 text-red-600" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Maximum Security (Recommended)</h3>
                      <p className="text-sm text-gray-500">Both Shamir sharing and social recovery for ultimate protection</p>
                    </div>
                  </div>
                  {selectedMethod === 'both' && <Check className="h-5 w-5 text-red-600" />}
                </div>
              </div>
            </div>

            <div className="mt-8 flex space-x-4">
              <button
                onClick={() => setStep('welcome')}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleInitialize}
                disabled={isInitializing}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isInitializing ? 'Initializing...' : 'Initialize KeyVault'}
              </button>
            </div>
          </>
        )}

        {step === 'complete' && (
          <>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <Check className="text-green-600" size={40} />
            </div>
            <h2 className="mt-8 text-3xl font-extrabold tracking-tighter text-gray-900">KeyVault Initialized!</h2>
            <p className="mt-4 text-lg text-gray-600">
              Your secure private key vault is ready. You can now start storing and managing your keys.
            </p>

            <div className="mt-8 flex space-x-4">
              <button
                onClick={() => router.push('/backup')}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Store Your First Key
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


