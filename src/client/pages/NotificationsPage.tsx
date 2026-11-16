import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  UserPlus,
  ListVideo,
  MessageSquare,
  CheckCheck,
} from 'lucide-react';
import { apiFetch, type PaginationMeta } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Pagination } from '../components/Pagination.js';

interface NotificationRow {
  id: number;
  type:
    | 'friend_request'
    | 'friend_accepted'
    | 'shared_watchlist_invite'
    | 'shared_watchlist_add'
    | 'friend_review';
  referenceId: number | null;
  tmdbId: number | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export function NotificationsPage() {
  const { user, refreshMe } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiFetch<{
        notifications: NotificationRow[];
        pagination: PaginationMeta;
      }>(`/notifications?page=${page}&limit=20`);
      setNotifications(res.notifications || []);
      setPagination(res.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, page]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      await refreshMe();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await refreshMe();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: NotificationRow['type']) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus className="w-4 h-4 text-rose-400" />;
      case 'shared_watchlist_invite':
      case 'shared_watchlist_add':
        return <ListVideo className="w-4 h-4 text-amber-400" />;
      case 'friend_review':
        return <MessageSquare className="w-4 h-4 text-rose-300" />;
      default:
        return <Bell className="w-4 h-4 text-stone-400" />;
    }
  };

  const getTargetLink = (n: NotificationRow): string => {
    if (n.type === 'friend_review' && n.tmdbId) {
      return `/movie/${n.tmdbId}`;
    }
    if (
      (n.type === 'shared_watchlist_add' ||
        n.type === 'shared_watchlist_invite') &&
      n.referenceId
    ) {
      return `/shared-watchlist/${n.referenceId}`;
    }
    if (n.type === 'friend_request') {
      return '/social';
    }
    return `/profile/${n.actor.username}`;
  };

  if (!user) {
    return (
      <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-8 text-center">
        <p className="text-sm text-stone-300">
          Sign in to view your notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-stone-400">
            Friend requests, shared watchlist updates, and friend reviews.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a0c10] hover:bg-rose-950/50 border border-rose-950/80 text-xs font-medium text-stone-200 transition"
        >
          <CheckCheck className="w-4 h-4 text-rose-400" />
          Mark all read
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-stone-400">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-10 text-center text-sm text-stone-400">
          You’re all caught up! No notifications yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition ${
                n.isRead
                  ? 'bg-[#1a0c10]/50 border-rose-950/50 text-stone-400'
                  : 'bg-[#1a0c10] border-rose-500/40 text-white shadow-sm'
              }`}
            >
              <Link
                to={getTargetLink(n)}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                className="flex items-start gap-3.5 flex-1 min-w-0"
              >
                <div className="w-9 h-9 rounded-xl bg-[#120609] border border-rose-950/80 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium leading-snug">
                    {n.message}
                  </p>
                  <span className="text-[11px] text-stone-500">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </Link>

              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(n.id)}
                  className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"
                  title="Mark as read"
                />
              )}
            </div>
          ))}

          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
