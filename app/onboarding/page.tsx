"use client";
import { Lock } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
export default function Page() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <Lock className="text-red-600" size={40} />
        </div>
        <h1 className="mt-8 text-4xl font-extrabold tracking-tighter text-gray-900 sm:text-5xl">KeyVault</h1>
        <p className="mt-4 text-lg text-gray-600">
          Your digital fortress for crypto assets. Securely back up your wallet, seed phrases, and private keys with military-grade encryption.
        </p>
        <div className="mt-10 flex justify-center">
          <ConnectButton />
        </div>
      </div>
    </div>
  );
}


