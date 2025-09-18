export default function Page() {
  return (
    <div className="relative flex size-full min-h-screen flex-col group/design-root overflow-x-hidden" style={{ fontFamily: 'Manrope, "Noto Sans", sans-serif' }}>
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 px-10 py-4 bg-white">
          <div className="flex items-center gap-4 text-[var(--text-primary)]">
            <div className="size-8 text-[var(--primary-color)]">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd"></path>
              </svg>
            </div>
            <h2 className="text-[var(--text-primary)] text-xl font-bold leading-tight tracking-[-0.015em]">KeyVault</h2>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <a className="hover:text-[var(--primary-color)] transition-colors" href="#">Dashboard</a>
              <a className="hover:text-[var(--primary-color)] transition-colors" href="#">Wallets</a>
              <a className="hover:text-[var(--primary-color)] transition-colors" href="#">Settings</a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="flex items-center justify-center rounded-full size-10 hover:bg-gray-100 transition-colors">
                <span className="material-symbols-outlined text-gray-600">notifications</span>
              </button>
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAWG6BCUs3JdLnGuNvCro_SimjNyOG_1pjjwMDcCvrqWtyGO0B3zg2x1ZHbuHJEBvMBb5QDgX2P6BwZb9zlCGjPdhip-MIs92BBlGhSFHWXVNvFZXgp9THZRPER0XZW5MU3CjZIS-IeYCssTgMhKOCO4-FCICM8-BdxN6HTjS2AWn0aBmaWrgqDuWB8lW7CdEQu8zLubraGj_-TX_h5uCj_6qEl1fG2g5rBkwfsi-coh0Y4QvMmwMtcJGkTRweYV6wrdv_awFsapA")' }}
              ></div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-[var(--text-primary)] text-3xl font-bold leading-tight tracking-tight">Dashboard</h1>
              <p className="text-gray-500 mt-1">Welcome back, here's an overview of your crypto security.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col gap-2 rounded-lg p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500">verified_user</span>
                  <p className="text-gray-600 text-base font-medium leading-normal">Wallets Protected</p>
                </div>
                <p className="text-[var(--text-primary)] text-4xl font-bold leading-tight">3</p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-500">update</span>
                  <p className="text-gray-600 text-base font-medium leading-normal">Last Backup</p>
                </div>
                <p className="text-[var(--text-primary)] text-4xl font-bold leading-tight">2 days ago</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-8">
              <h2 className="text-[var(--text-primary)] text-xl font-bold leading-tight tracking-[-0.015em] mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-4">
                <button className="flex min-w-[84px] items-center justify-center gap-2 rounded-md h-10 px-4 bg-[var(--primary-color)] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                  <span className="truncate">Manage Wallets</span>
                </button>
                <button className="flex min-w-[84px] items-center justify-center gap-2 rounded-md h-10 px-4 bg-gray-100 text-[var(--text-primary)] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors">
                  <span className="material-symbols-outlined">add_to_photos</span>
                  <span className="truncate">New Backup</span>
                </button>
              </div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
              <h2 className="text-[var(--text-primary)] text-xl font-bold leading-tight tracking-[-0.015em] mb-6">Recent Activity</h2>
              <div className="flow-root">
                <ul className="-mb-8">
                  <li>
                    <div className="relative pb-8">
                      <span aria-hidden="true" className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                      <div className="relative flex space-x-4 items-start">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-white">
                            <span className="material-symbols-outlined text-green-600">check</span>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5">
                          <p className="text-sm text-gray-800 font-medium">Backup Complete</p>
                          <p className="text-sm text-gray-500">2 days ago</p>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li>
                    <div className="relative pb-8">
                      <span aria-hidden="true" className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                      <div className="relative flex space-x-4 items-start">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                            <span className="material-symbols-outlined text-blue-600">add</span>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5">
                          <p className="text-sm text-gray-800 font-medium">New Wallet Added</p>
                          <p className="text-sm text-gray-500">5 days ago</p>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li>
                    <div className="relative pb-0">
                      <div className="relative flex space-x-4 items-start">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                            <span className="material-symbols-outlined text-gray-600">play_arrow</span>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5">
                          <p className="text-sm text-gray-800 font-medium">Backup Initiated</p>
                          <p className="text-sm text-gray-500">5 days ago</p>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


