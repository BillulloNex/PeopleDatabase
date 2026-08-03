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
        {children}
      </body>
    </html>
  );
}
