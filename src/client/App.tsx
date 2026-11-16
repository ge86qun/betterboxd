import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { Layout } from './components/Layout.js';
import { HomePage } from './pages/HomePage.js';
import { SearchPage } from './pages/SearchPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { MovieDetailPage } from './pages/MovieDetailPage.js';
import { WatchlistPage } from './pages/WatchlistPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { SocialPage } from './pages/SocialPage.js';
import { SharedWatchlistDetailPage } from './pages/SharedWatchlistDetailPage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/movie/:tmdbId" element={<MovieDetailPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route
              path="/shared-watchlist/:id"
              element={<SharedWatchlistDetailPage />}
            />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
