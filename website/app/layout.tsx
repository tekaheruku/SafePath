import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppNav from '../components/AppNav'

const inter = Inter({ subsets: ['latin'] })

import { AuthProvider } from '../components/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';

export const metadata: Metadata = {
  title: 'SafePath | Urban Safety Mapping',
  description: 'GIS-integrated platform for community-driven urban safety mapping and analytics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 min-h-screen flex flex-col`}>
        <ThemeProvider>
          <AuthProvider>
            <AppNav />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-slate-800 py-6 text-center text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} SafePath. All rights reserved.
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
