import { Fingerprint, Group, Settings } from "lucide-react";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-800">
      <main className="container mx-auto flex-grow px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">Recovery Options</h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Choose how you want to recover your KeyVault if you lose access to your device. Your security is our priority.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <Group className="text-[var(--primary-color)]" size={28} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Family Recovery</h3>
              </div>
              <p className="mt-4 flex-grow text-base text-gray-600">
                Designate trusted family members or friends to help you recover your KeyVault. They will each receive a recovery key, and a majority will need to cooperate to unlock your vault.
              </p>
              <div className="mt-8">
                <button className="flex w-full items-center justify-center gap-2 rounded-md h-11 px-6 bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-sm font-bold transition-colors hover:bg-[var(--primary-color)]/20">
                  <Settings size={18} />
                  <span className="truncate">Configure Family Recovery</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <Fingerprint className="text-[var(--primary-color)]" size={28} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Biometric Security</h3>
              </div>
              <p className="mt-4 flex-grow text-base text-gray-600">
                Use your device's fingerprint or facial recognition to secure your KeyVault. This method provides quick and convenient access while maintaining a high level of security.
              </p>
              <div className="mt-8">
                <button className="flex w-full items-center justify-center gap-2 rounded-md h-11 px-6 bg-[var(--primary-color)]/10 text-[var(--primary-color)] text-sm font-bold transition-colors hover:bg-[var(--primary-color)]/20">
                  <Settings size={18} />
                  <span className="truncate">Configure Biometric Security</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


