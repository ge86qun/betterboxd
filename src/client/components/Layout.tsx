import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Search,
  Bookmark,
  Users,
  Bell,
  User as UserIcon,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, unreadNotificationsCount, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const navItems = [
    { to: '/', label: 'Discover', icon: Compass, exact: true },
    { to: '/search', label: 'Search', icon: Search },
    ...(user
      ? [
          { to: '/watchlist', label: 'Watchlist', icon: Bookmark },
          { to: '/social', label: 'Social', icon: Users },
          {
            to: `/profile/${user.username}`,
            label: 'Profile',
            icon: UserIcon,
          },
        ]
      : [{ to: '/auth', label: 'Sign In', icon: LogIn }]),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-stone-100 pb-20 md:pb-8">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#14090c]/90 backdrop-blur-md border-b border-rose-950/60">
        <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Creative Theater Curtain & Ticket Marquee Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-red-700 to-rose-950 p-0.5 shadow-lg shadow-rose-950/60 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-[10px] bg-[#16080c] flex items-center justify-center relative overflow-hidden">
                {/* Velvet Curtain SVG */}
                <svg
                  viewBox="0 0 32 32"
                  className="w-6 h-6"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Gold Marquee Top Bar */}
                  <rect
                    x="3"
                    y="4"
                    width="26"
                    height="2.5"
                    rx="1.25"
                    className="fill-amber-400"
                  />
                  {/* Left Velvet Curtain Drape */}
                  <path
                    d="M4 6.5H15C15 13 11.5 18 7.5 21.5L10 27.5H4V6.5Z"
                    className="fill-rose-600"
                  />
                  {/* Right Velvet Curtain Drape */}
                  <path
                    d="M28 6.5H17C17 13 20.5 18 24.5 21.5L22 27.5H28V6.5Z"
                    className="fill-rose-500"
                  />
                  {/* Center Spotlight Star */}
                  <path
                    d="M16 12.5L17.1 15.2L20 15.5L17.8 17.4L18.5 20.2L16 18.7L13.5 20.2L14.2 17.4L12 15.5L14.9 15.2L16 12.5Z"
                    className="fill-amber-300"
                  />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-lg sm:text-xl bg-gradient-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent group-hover:from-rose-300 group-hover:to-amber-300 transition-all leading-none">
                Betterboxd
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-rose-400/80 font-semibold mt-0.5">
                Velvet Screening Room
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                        : 'text-stone-300 hover:text-white hover:bg-rose-950/40'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {user && (
              <>
                <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                    `relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                        : 'text-stone-300 hover:text-white hover:bg-rose-950/40'
                    }`
                  }
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      {unreadNotificationsCount > 99
                        ? '99+'
                        : unreadNotificationsCount}
                    </span>
                  )}
                </NavLink>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="ml-1 p-2 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </nav>

          {/* Mobile Top Right Quick Actions */}
          <div className="flex md:hidden items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/notifications"
                  className="relative p-2 rounded-lg text-stone-300 hover:bg-rose-950/40"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotificationsCount > 9
                        ? '9+'
                        : unreadNotificationsCount}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-stone-400 hover:text-rose-400"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 sm:py-8">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar (Native App Feel) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#14090c]/95 backdrop-blur-lg border-t border-rose-950/80">
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                    isActive
                      ? 'text-rose-400'
                      : 'text-stone-400 hover:text-stone-200'
                  }`
                }
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="truncate max-w-[64px]">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
