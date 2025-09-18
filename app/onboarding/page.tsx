export default function Page() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <span className="material-symbols-outlined text-5xl text-red-600">lock</span>
        </div>
        <h1 className="mt-8 text-4xl font-extrabold tracking-tighter text-gray-900 sm:text-5xl">KeyVault</h1>
        <p className="mt-4 text-lg text-gray-600">
          Your digital fortress for crypto assets. Securely back up your wallet, seed phrases, and private keys with military-grade encryption.
        </p>
        <div className="mt-10">
          <button className="w-full rounded-lg bg-red-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-50">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}


