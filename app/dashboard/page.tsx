import { Bell, Check, Play, Plus, PlusSquare, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
export default function Page() {
  return (
    <div className="relative flex size-full flex-col group/design-root overflow-x-hidden" style={{ fontFamily: 'Manrope, "Noto Sans", sans-serif' }}>
      <div className="layout-container flex h-full grow flex-col">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-[var(--text-primary)] text-3xl font-bold leading-tight tracking-tight">Dashboard</h1>
              <p className="text-gray-500 mt-1">Welcome back, here's an overview of your crypto security.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col gap-2 rounded-lg p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-green-500" size={20} />
                  <p className="text-gray-600 text-base font-medium leading-normal">Wallets Protected</p>
                </div>
                <p className="text-[var(--text-primary)] text-4xl font-bold leading-tight">3</p>
              </div>
              <div className="flex flex-col gap-2 rounded-lg p-6 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <RefreshCw className="text-blue-500" size={20} />
                  <p className="text-gray-600 text-base font-medium leading-normal">Last Backup</p>
                </div>
                <p className="text-[var(--text-primary)] text-4xl font-bold leading-tight">2 days ago</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-8">
              <h2 className="text-[var(--text-primary)] text-xl font-bold leading-tight tracking-[-0.015em] mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-4">
                <button className="flex min-w-[84px] items-center justify-center gap-2 rounded-md h-10 px-4 bg-[var(--primary-color)] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors">
                  <Wallet size={18} />
                  <span className="truncate">Manage Wallets</span>
                </button>
                <button className="flex min-w-[84px] items-center justify-center gap-2 rounded-md h-10 px-4 bg-gray-100 text-[var(--text-primary)] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-200 transition-colors">
                  <PlusSquare size={18} />
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
                          <Check className="text-green-600" size={18} />
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
                          <Plus className="text-blue-600" size={18} />
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
                          <Play className="text-gray-600" size={18} />
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


