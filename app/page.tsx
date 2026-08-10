'use client'

import Link from 'next/link'

function MobileWelcome() {
  return <section className="lg:hidden relative min-h-[100svh] overflow-hidden bg-[#0b2313] text-white flex flex-col items-center px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(22,163,74,.28),transparent_42%),linear-gradient(160deg,#123524_0%,#0b2313_58%,#071a0e_100%)]"/>
    <div className="relative z-10 flex-1 w-full max-w-[390px] flex flex-col items-center justify-center text-center">
      <img src="/icons/alajo-mark.svg" alt="Alajo" className="w-[138px] h-[138px]"/>
      <div className="mt-3 text-[40px] leading-none font-semibold tracking-[.17em] text-[#f5c542]">ALAJO</div>
      <div className="mt-6 w-32 h-px bg-gradient-to-r from-transparent via-[#eab308] to-transparent"/>
      <p className="mt-5 text-[17px] font-light tracking-wide text-white/90">Smart Rotational Savings</p>
      <Link href="/login" className="mt-9 w-full max-w-[330px] h-[54px] rounded-xl bg-[#16a34a] text-white text-[17px] font-semibold shadow-[0_10px_28px_rgba(22,163,74,.25)] flex items-center justify-center">Login</Link>
      <p className="mt-4 text-center text-[14px] text-white/70">New to Alajo? <Link href="/signup" className="text-[#f5c542] font-medium">Create an account</Link></p>
    </div>
  </section>
}

function DesktopHome() {
  const groups = [['₦20,000 Group','6 Months Cycle','₦20,000','6 / 10'],['₦50,000 Group','6 Months Cycle','₦50,000','7 / 10'],['₦100,000 Group','10 Months Cycle','₦100,000','5 / 10']]
  const stats = [['10K+','Active Users'],['500+','Savings Groups'],['₦250M+','Total Saved'],['99.9%','Success Rate']]
  return <div className="hidden lg:block min-h-screen bg-white text-gray-900">
    <header className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6 lg:px-10"><Link href="/" className="flex items-center gap-1"><span className="text-[26px] font-extrabold tracking-tight text-gray-900">Alajo</span><span className="text-[#16a34a]">●</span></Link><div className="flex items-center gap-3"><Link href="/login" className="px-5 py-2 text-[15px] font-semibold rounded-md border border-gray-300">Login</Link><Link href="/signup" className="px-5 py-2 text-[15px] font-semibold rounded-md bg-[#14532d] text-white">Get Started</Link></div></header>
    <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 pb-14 pt-12 lg:px-10 lg:pt-16"><div><h1 className="font-bold text-[44px] leading-[1.15] max-w-[520px]">Smart Rotational Savings for Everyone</h1><p className="mt-6 text-[17px] leading-relaxed text-gray-500 max-w-[420px]">Join thousands of people already saving and growing together with Alajo.</p><div className="mt-8 flex items-center gap-4"><Link href="/signup" className="px-7 py-3 text-[15px] font-semibold rounded-md bg-[#14532d] text-white">Get Started</Link><a href="#how-it-works" className="px-7 py-3 text-[15px] font-semibold rounded-md border border-gray-900">Learn More</a></div></div><div className="relative h-[520px] hidden xl:block"><div className="absolute left-0 top-6 w-[420px] bg-[#1a1a1a] rounded-xl p-2 shadow-2xl"><div className="bg-white rounded-md h-[260px]"/></div><div className="absolute right-0 top-0 w-[220px] bg-black rounded-[22px] p-2.5 shadow-2xl"><div className="bg-white rounded-[14px] h-[400px]"/></div></div></section>
    <section className="border-y border-gray-100 bg-white"><div className="mx-auto grid max-w-[1200px] grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">{stats.map(([value,label],i)=><div key={label} className="px-6 py-8 text-center"><div className={`text-[30px] font-extrabold tracking-tight ${i===0?'text-[#14532d]':i===1?'text-[#eab308]':i===2?'text-[#16a34a]':'text-[#14532d]'}`}>{value}</div><div className="mt-1 text-[13px] font-medium text-gray-500">{label}</div></div>)}</div></section>
  </div>
}

export default function Home() { return <main><MobileWelcome/><DesktopHome/></main> }
