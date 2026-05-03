'use client';

import React, { useState } from 'react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {user?.role === 'lgu_admin' && (
        <Link
          href="/admin/id-verifications"
          onClick={closeSidebar}
          className={`${mobile ? 'block w-full text-left' : ''} px-4 py-2 rounded-lg transition-all duration-150 ${
            isActive('/admin/id-verifications')
              ? 'bg-indigo-600 text-theme-fg font-semibold shadow-md shadow-indigo-500/30'
              : 'text-theme-fg-muted hover:text-theme-fg hover:bg-theme-panel'
          }`}
        >
          Verification Requests
        </Link>
      )}
      {(user?.role === 'superadmin' || user?.role === 'lgu_admin') && (
        <Link
          href="/admin/accounts"
          onClick={closeSidebar}
          className={`${mobile ? 'block w-full text-left' : ''} px-4 py-2 rounded-lg transition-all duration-150 ${
            isActive('/admin/accounts')
              ? 'bg-indigo-600 text-theme-fg font-semibold shadow-md shadow-indigo-500/30'
              : 'text-theme-fg-muted hover:text-theme-fg hover:bg-theme-panel'
          }`}
        >
          Accounts
        </Link>
      )}
      {user?.role === 'superadmin' && (
        <Link
          href="/admin/requests"
          onClick={closeSidebar}
          className={`${mobile ? 'block w-full text-left' : ''} px-4 py-2 rounded-lg transition-all duration-150 ${
            isActive('/admin/requests')
              ? 'bg-indigo-600 text-theme-fg font-semibold shadow-md shadow-indigo-500/30'
              : 'text-theme-fg-muted hover:text-theme-fg hover:bg-theme-panel'
          }`}
        >
          Admin Requests
        </Link>
      )}
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          onClick={closeSidebar}
          className={`${mobile ? 'block w-full text-left' : ''} px-4 py-2 rounded-lg transition-all duration-150 ${
            isActive(href)
              ? 'bg-indigo-600 text-theme-fg font-semibold shadow-md shadow-indigo-500/30'
              : 'text-theme-fg-muted hover:text-theme-fg hover:bg-theme-panel'
          }`}
        >
          {label}
        </Link>
      ))}
    </>
  );

  return (
    <>
      <nav className="border-b border-theme-border bg-theme-bg-start/50 backdrop-blur-md sticky top-0 z-[9999]">
        <div className="container mx-auto px-4 h-16 flex items-center">
          {/* Hamburger Menu - Visible on mobile only, positioned top-left */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 text-theme-fg hover:bg-theme-panel rounded-lg transition-colors"
            aria-label="Toggle Menu"
          >
            <span className="text-2xl">☰</span>
          </button>

          {/* Logo - Left side on desktop, hidden on mobile */}
          <Link href="/" className="hidden md:flex items-center space-x-2 mr-auto">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center font-bold text-theme-fg">S</div>
            <span className="font-bold text-xl tracking-tight">SafePath</span>
          </Link>

          {/* Desktop Functional Buttons (Links + Actions) - Right side on desktop */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-1 text-sm font-medium border-r border-theme-border pr-6 mr-2">
              <NavLinks />
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/settings"
                className="p-2 rounded-full bg-theme-panel hover:bg-theme-border-hover text-sm font-semibold transition-all"
                title="Settings"
                aria-label="Settings"
              >
                ⚙️
              </Link>

              {user ? (
                <div className="flex items-center space-x-4">
                  <Link href="/settings#profile" className="text-sm text-theme-fg-muted hover:text-theme-fg transition-colors">
                    Hi, <span className="text-theme-fg font-semibold">{user.name}</span>
                  </Link>
                  
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to logout?')) {
                        logout();
                      }
                    }}
                    className="px-4 py-2 rounded-full bg-theme-panel hover:bg-theme-border-hover text-sm font-semibold transition-all"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-full bg-theme-panel hover:bg-theme-border-hover text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] transition-opacity duration-300"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-slate-950 border-r border-theme-border shadow-2xl z-[10001] transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button - Fixed to top-right */}
        <button
          onClick={closeSidebar}
          className="absolute top-4 right-4 p-2 text-theme-fg-muted hover:text-theme-fg hover:bg-theme-panel rounded-lg transition-colors z-10"
          aria-label="Close Menu"
        >
          <span className="text-xl font-bold">✕</span>
        </button>

        <div className="flex flex-col h-full p-6">
          {/* 1. User Profile Section at the very top */}
          <div className="mb-6 pt-2">
            {user ? (
              <div className="flex items-center space-x-3 p-3 bg-theme-panel/50 rounded-xl border border-theme-border/50">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-theme-fg font-bold shadow-lg shadow-indigo-500/20">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs text-theme-fg-muted">Active Session</div>
                  <div className="font-bold text-theme-fg truncate">{user.name}</div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-theme-panel/30 rounded-xl border border-dashed border-theme-border/30 text-center">
                <span className="text-sm text-theme-fg-muted italic">Guest Mode</span>
              </div>
            )}
          </div>

          {/* 2. Brand/Logo Section below profile */}
          <div className="mb-8">
            <Link href="/" onClick={closeSidebar} className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center font-bold text-theme-fg transition-transform group-hover:scale-110">S</div>
              <span className="font-bold text-xl tracking-tight">SafePath</span>
            </Link>
          </div>

          {/* 3. Functional buttons listed vertically in the middle */}
          <div className="flex-grow space-y-1 overflow-y-auto no-scrollbar pr-1">
            <div className="text-[10px] font-bold text-theme-fg-muted uppercase tracking-wider mb-2 px-4">Navigation</div>
            <NavLinks mobile />
          </div>

          {/* 4 & 5. Settings and Logout at the bottom */}
          <div className="mt-auto pt-6 border-t border-theme-border space-y-2">
            <Link 
              href="/settings" 
              onClick={closeSidebar}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 ${
                isActive('/settings')
                  ? 'bg-indigo-600 text-theme-fg font-semibold'
                  : 'text-theme-fg-muted hover:text-theme-fg hover:bg-theme-panel'
              }`}
            >
              <span className="text-lg">⚙️</span>
              <span className="font-medium">Settings</span>
            </Link>

            {user ? (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to logout?')) {
                    logout();
                    closeSidebar();
                  }
                }}
                className="flex items-center space-x-3 w-full px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors text-left"
              >
                <span className="text-lg">🚪</span>
                <span className="font-medium">Logout</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={closeSidebar}
                  className="py-3 text-center rounded-xl bg-theme-panel hover:bg-theme-border-hover text-sm font-semibold transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={closeSidebar}
                  className="py-3 text-center rounded-xl bg-blue-600 hover:bg-blue-500 text-theme-fg text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
                >
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppNav;

