import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkillRegistry — npm for AI agent skills',
  description: 'Discover, install, and publish AI agent skills with built-in security scanning.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-zinc-800">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-xl font-bold">
              SkillRegistry
            </Link>
            <div className="flex gap-4 text-sm text-zinc-400">
              <Link href="/skills" className="hover:text-white">
                Skills
              </Link>
              <Link href="/trending" className="hover:text-white">
                Trending
              </Link>
              <Link href="/docs" className="hover:text-white">
                Docs
              </Link>
              <Link href="/auth/login" className="hover:text-white">
                Login
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
          MIT License · SkillRegistry
        </footer>
      </body>
    </html>
  );
}
