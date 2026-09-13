import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppNav from '../components/AppNav'
import SafetyChatWidget from '../components/SafetyChatWidget'

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
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ThemeProvider>
          <AuthProvider>
            <AppNav />
            <main className="flex-grow w-full py-6">
              {children}
            </main>
            <SafetyChatWidget />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
