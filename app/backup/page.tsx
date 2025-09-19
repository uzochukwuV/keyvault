import { CloudDownload as CloudSync, HardDriveDownloadIcon as Hardware, Key, Menu, ShieldCheck } from "lucide-react";

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--background-light)] text-[var(--text-primary)]">
        <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-sm">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--primary-color)]/10 mb-6">
              <CloudSync className="text-[var(--primary-color)]" size={36} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Automated One-Click Backup</h2>
            <p className="mt-4 text-lg text-[var(--text-secondary)]">
              Effortlessly secure your digital assets. KeyVault automatically encrypts and stores your wallet's seed phrase on the decentralized and ultra-secure Filecoin network.
            </p>
          </div>
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-center mb-6">Compatible with your favorite wallets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-light)] p-4 transition-all hover:shadow-md hover:border-[var(--primary-color)]/50">
                <img alt="MetaMask Logo" className="h-10 w-10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCGBxzDao5cbz4AT8lEIP_j-DxVg6wjKRi5KYmDjuaw5Canflz4GX-O3DbwKqB-LM4nUzW20F_6jQBulr7PyNs1kF63bONXnBx69f3TC3f68yEHfiT-2473tpOuJzUuVbJv2b82atkJx-htrrDJJw9dqzkZ_KtF32NNnu0sqeaeKzu4Rxfm7yxEJnsUM2_hyWgpA4l4JNMFfFfku0T6S2jcyWi_Uq57pvEAiQNr-cQdqGaeZC6_D8pZd75xuYpgsgvP8rAKn5_RQ" />
                <h4 className="text-sm font-semibold">MetaMask</h4>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-light)] p-4 transition-all hover:shadow-md hover:border-[var(--primary-color)]/50">
                <img alt="Rainbow Wallet Logo" className="h-10 w-10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAo5YNU1yiPIx3B2-F8G8MfL5PVUDdbja5FdBRQ4xr3hbxAsWcchCcf2EmIx2-E0og22IPdnmfiZ3lrOZiZOTVYEZMk13z_aNWzqBIcUTgmNjctRUm4HxU8owZ42TjCf5oHzh0slGnBtGJclwCTfa2LAGfLCwscPOlKcf9JcG3yO21OUiNCcyr0Y0pVY2SrniIB1xlvI0Ed6VPKRu2TF93taXc7wubzd2obY9U1yOH2Wg-3nRU6Eti9cKA_5UijluUBB9nnzLPsuQ" />
                <h4 className="text-sm font-semibold">Rainbow</h4>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-light)] p-4 transition-all hover:shadow-md hover:border-[var(--primary-color)]/50">
                <img alt="Coinbase Wallet Logo" className="h-10 w-10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdWFjK-gd_iWDirSbA1dkLfdPcjte1DMB-icZdA_2F7P1LiRx1DrXiDk-H1WsP0Sbto9DUawgBrKQ3_neKcZhlgKwc0I1aankXYnrD0Fbj_CgnebdKfy440xf0nMnxoP0B74Yxi7ygLFA-eiJ1ZS2bYYirCo7jaYXpj-xcXN6QpRTQCLE2yDbNE4JxGa5ecQQp1ll1EHMFBej7EPRR9XYGMcCwND5rp2lUXzZlrrslRk1WmPrnIRQySTJa55c1b1MOugkLXc4NgA" />
                <h4 className="text-sm font-semibold">Coinbase Wallet</h4>
              </div>
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-light)] p-4 transition-all hover:shadow-md hover:border-[var(--primary-color)]/50">
                <Hardware className="text-[var(--text-secondary)]" size={36} />
                <h4 className="text-sm font-semibold">Hardware Wallets</h4>
              </div>
            </div>
          </div>
          <div className="mt-12 text-center">
            <button className="w-full max-w-sm mx-auto flex items-center justify-center gap-3 rounded-xl h-14 px-8 bg-[var(--primary-color)] text-white text-lg font-bold shadow-lg shadow-[var(--primary-color)]/30 hover:bg-[var(--primary-hover-color)] transition-all transform hover:scale-105">
              <ShieldCheck size={20} />
              <span>Initiate Secure Backup</span>
            </button>
            <p className="mt-4 text-xs text-[var(--text-secondary)]">By clicking, you agree to our Terms of Service.</p>
          </div>
        </div>
      </main>
    </div>
  );
}


