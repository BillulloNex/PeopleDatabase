import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PeopleDatabase',
  description: 'People database with continuous ingestion, identity resolution, and outreach tracking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen selection:bg-indigo-500 selection:text-white">
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center font-semibold text-white text-sm">
                P
              </div>
              <span className="font-semibold text-sm text-slate-100 tracking-tight">
                PeopleDatabase
              </span>
            </div>

            <a
              href="https://people.beenex.org"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors rounded-md"
            >
              people.beenex.org ↗
            </a>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
