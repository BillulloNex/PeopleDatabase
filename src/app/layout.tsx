import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PeopleDatabase — Global Intelligence & Outreach Engine',
  description: 'Web-scale digital representation of people, continuous ingestion, identity resolution, and sales outreach.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080C14] text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white">
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-white text-lg">
                P
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight gradient-text">PeopleDatabase</span>
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Global Engine
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Exa + GPT-5.6 Active</span>
              </div>
              <a
                href="https://people.beenex.org"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 hover:text-white transition-colors"
              >
                people.beenex.org ↗
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
