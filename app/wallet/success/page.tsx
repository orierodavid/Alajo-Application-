import Link from 'next/link'
import { AlajoIcon } from '@/components/ui/alajo-icon'

export default function WalletSuccessPage() {
  return (
    <div className="min-h-screen bg-[#f7f8f9] text-gray-900 flex items-center justify-center p-5">
      <main className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-50 text-[#16a34a] flex items-center justify-center">
            <AlajoIcon name="check" size={30} />
          </div>
          <p className="text-gray-400 text-[12px] uppercase tracking-[.16em] font-semibold mt-6">Wallet</p>
          <h1 className="font-bold text-[25px] mt-2">Wallet funded successfully</h1>
          <p className="text-gray-500 text-[14px] leading-6 mt-3">Your payment was successful. Your wallet balance will reflect the verified payment.</p>
          <div className="mt-6 rounded-xl bg-green-50 p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white text-[#16a34a] flex items-center justify-center"><AlajoIcon name="wallet" size={18}/></div>
              <div><p className="text-[12px] text-gray-500">Payment status</p><p className="text-sm font-semibold text-[#16a34a]">Successful</p></div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link href="/wallet" className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">View Wallet</Link>
            <Link href="/dashboard" className="rounded-xl bg-[#14532d] text-white py-3 text-sm font-semibold hover:bg-[#0f4022]">Go to Dashboard</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
