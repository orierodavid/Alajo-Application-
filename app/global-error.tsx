'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-[#f5f7f5] text-[#142019]">
        <main className="min-h-screen flex items-center justify-center p-6">
          <section className="w-full max-w-md rounded-2xl border border-[#e5ebe7] bg-white p-7 shadow-sm text-center">
            <div className="mx-auto h-11 w-11 rounded-xl bg-[#eaf7ef] text-[#126b39] flex items-center justify-center font-bold">A</div>
            <h1 className="mt-4 text-lg font-bold">Alajo is having trouble loading this page</h1>
            <p className="mt-2 text-sm text-[#718078]">Please try again. No internal error details are displayed here.</p>
            <button onClick={() => reset()} className="mt-5 rounded-xl bg-[#0f5b32] px-4 py-2.5 text-xs font-semibold text-white">Try again</button>
          </section>
        </main>
      </body>
    </html>
  )
}
