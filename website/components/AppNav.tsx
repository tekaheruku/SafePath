'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';

const NAV_LINKS = [
  { href: '/',           label: 'Map' },
  { href: '/incidents',  label: 'Incidents' },
  { href: '/report',     label: 'Report' },
  { href: '/my-reports', label: 'My Reports' },
];

const AppNav: React.FC = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-[9999]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center font-bold text-white">S</div>
          <span className="font-bold text-xl tracking-tight">SafePath</span>
        </Link>

        <div className="hidden md:flex items-center space-x-1 text-sm font-medium">
          {(user?.role === 'superadmin' || user?.role === 'lgu_admin') && (
            <Link
              href="/admin/accounts"
              className={`px-4 py-2 rounded-lg transition-all duration-150 ${
                isActive('/admin/accounts')
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Accounts
            </Link>
          )}
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg transition-all duration-150 ${
                isActive(href)
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-300">Hi, <span className="text-white font-semibold">{user.name}</span></span>
              
              <Link
                href="/settings"
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-all"
                title="Settings"
                aria-label="Settings"
              >
                ⚙️
              </Link>

              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to logout?')) {
                    logout();
                  }
                }}
                className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AppNav;
