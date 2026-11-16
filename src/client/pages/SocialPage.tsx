import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Check,
  X,
  Plus,
  ListVideo,
  Trash2,
  LogOut,
} from 'lucide-react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';

export function SocialPage() {
  const { user, refreshMe } = useAuth();
  const [activeTab, setActiveTab] = useState<'shared' | 'friends'>('shared');

  // Friends state
  const [friends, setFriends] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

  // Shared watchlists state
  const [sharedWatchlists, setSharedWatchlists] = useState<any[]>([]);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [selectedFriendsForList, setSelectedFriendsForList] = useState<
    number[]
  >([]);

  const [loading, setLoading] = useState(true);

  const loadAllSocial = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [friendsRes, sharedRes] = await Promise.all([
        apiFetch<{
          friends: any[];
          incomingRequests: any[];
          outgoingRequests: any[];
        }>('/friends'),
        apiFetch<{ sharedWatchlists: any[] }>('/shared-watchlists'),
      ]);

      setFriends(friendsRes.friends || []);
      setIncomingRequests(friendsRes.incomingRequests || []);
      setSharedWatchlists(sharedRes.sharedWatchlists || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAllSocial();
  }, [loadAllSocial]);

  const handleRespondFriend = async (
    friendshipId: number,
    action: 'accept' | 'decline'
  ) => {
    try {
      await apiFetch(`/friends/respond/${friendshipId}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      await loadAllSocial();
      await refreshMe();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveFriend = async (friendshipId: number) => {
    if (!confirm('Remove this friend?')) return;
    try {
      await apiFetch(`/friends/${friendshipId}`, { method: 'DELETE' });
      await loadAllSocial();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSharedWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    try {
      await apiFetch('/shared-watchlists', {
        method: 'POST',
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDesc.trim() || undefined,
          memberIds: selectedFriendsForList,
        }),
      });
      setNewListName('');
      setNewListDesc('');
      setSelectedFriendsForList([]);
      await loadAllSocial();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLeaveSharedWatchlist = async (
    e: React.MouseEvent,
    listId: number,
    listName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Exit shared watchlist "${listName}"?`)) return;
    try {
      await apiFetch(`/shared-watchlists/${listId}/members/me`, {
        method: 'DELETE',
      });
      await loadAllSocial();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-8 text-center space-y-3">
        <p className="text-sm text-stone-300">
          Please sign in to manage friends and shared watchlists.
        </p>
        <Link
          to="/auth"
          className="inline-block px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Social
          </h1>
          <p className="text-xs sm:text-sm text-stone-400">
            Create named shared watchlists with any number of friends, and manage your connections.
          </p>
        </div>

        <Link
          to="/search?tab=users"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm self-start transition shadow-md shadow-rose-950/50"
        >
          <UserPlus className="w-4 h-4" />
          Find Friends
        </Link>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-rose-950/70 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('shared')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'shared'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
              : 'bg-[#1a0c10] text-stone-300 hover:text-white border border-rose-950/60'
          }`}
        >
          <ListVideo className="w-4 h-4" />
          <span>Shared Watchlists ({sharedWatchlists.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeTab === 'friends'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
              : 'bg-[#1a0c10] text-stone-300 hover:text-white border border-rose-950/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Friends ({friends.length})</span>
          {incomingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 font-bold text-[10px]">
              +{incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-stone-400">
          Loading social hub...
        </div>
      ) : activeTab === 'shared' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Shared Watchlist Form */}
          <form
            onSubmit={handleCreateSharedWatchlist}
            className="rounded-2xl bg-[#1a0c10] border border-rose-950/70 p-5 space-y-4 self-start"
          >
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-400" />
              New Shared Watchlist
            </h2>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Watchlist Name
              </label>
              <input
                type="text"
                required
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Friday Night Horror, Sci-Fi Club..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#120609] border border-rose-950/80 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                placeholder="What are we watching?"
                className="w-full px-3.5 py-2 rounded-xl bg-[#120609] border border-rose-950/80 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Add Friends ({selectedFriendsForList.length} selected)
              </label>
              {friends.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#120609] border border-rose-950/80 text-xs text-stone-400">
                  Add friends first or create the list now and add friends later.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 p-2.5 rounded-xl bg-[#120609] border border-rose-950/80">
                  {friends.map((f) => {
                    const checked = selectedFriendsForList.includes(f.user.id);
                    return (
                      <label
                        key={f.user.id}
                        className="flex items-center gap-2.5 text-xs text-stone-200 cursor-pointer p-1 rounded hover:bg-rose-950/30"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFriendsForList((prev) => [
                                ...prev,
                                f.user.id,
                              ]);
                            } else {
                              setSelectedFriendsForList((prev) =>
                                prev.filter((id) => id !== f.user.id)
                              );
                            }
                          }}
                          className="rounded border-rose-900 bg-[#1a0c10] text-rose-600 focus:ring-rose-500"
                        />
                        <span className="truncate">
                          {f.user.displayName || f.user.username}{' '}
                          <span className="text-stone-400">
                            @{f.user.username}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm transition shadow-md shadow-rose-950/50"
            >
              Create Shared Watchlist
            </button>
          </form>

          {/* Shared Watchlists Cards */}
          <div className="lg:col-span-2">
            {sharedWatchlists.length === 0 ? (
              <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-8 text-center text-sm text-stone-400">
                No shared watchlists yet. Name one on the left and pick any friends to include!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sharedWatchlists.map((list) => (
                  <Link
                    key={list.id}
                    to={`/shared-watchlist/${list.id}`}
                    className="p-5 rounded-2xl bg-[#1a0c10] border border-rose-950/70 hover:border-rose-500/60 transition flex flex-col justify-between gap-4 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-600/15 border border-rose-500/30 text-rose-300 text-[11px] font-medium truncate">
                          {list.contextLabel}
                        </span>
                        <span className="text-xs text-stone-400 shrink-0">
                          {list.itemCount} films
                        </span>
                      </div>
                      <h3 className="mt-2.5 font-bold text-base text-white group-hover:text-rose-400 transition-colors">
                        {list.name}
                      </h3>
                      {list.description && (
                        <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                          {list.description}
                        </p>
                      )}

                      {list.members?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {list.members.map((m: any) => (
                            <span
                              key={m.userId}
                              className="px-2 py-0.5 rounded-md bg-[#120609] border border-rose-950/80 text-[11px] text-stone-300"
                            >
                              @{m.username}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-rose-950/60 flex items-center justify-between">
                      <span className="text-xs font-medium text-rose-400">
                        Open watchlist →
                      </span>
                      <button
                        type="button"
                        onClick={(e) =>
                          handleLeaveSharedWatchlist(e, list.id, list.name)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#120609] hover:bg-rose-950/60 text-stone-400 hover:text-rose-300 text-[11px] transition"
                        title="Exit shared watchlist"
                      >
                        <LogOut className="w-3 h-3" />
                        Exit
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Incoming Friend Requests */}
          {incomingRequests.length > 0 && (
            <div className="rounded-2xl bg-rose-950/25 border border-rose-500/30 p-5 space-y-3">
              <h2 className="text-sm font-bold text-rose-300">
                Incoming Friend Requests ({incomingRequests.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req.friendshipId}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#1a0c10] border border-rose-950/80"
                  >
                    <Link
                      to={`/profile/${req.user.username}`}
                      className="font-semibold text-sm text-white hover:text-rose-400"
                    >
                      {req.user.displayName || req.user.username}{' '}
                      <span className="text-xs font-normal text-stone-400">
                        @{req.user.username}
                      </span>
                    </Link>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleRespondFriend(req.friendshipId, 'accept')
                        }
                        className="p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleRespondFriend(req.friendshipId, 'decline')
                        }
                        className="p-2 rounded-lg bg-[#120609] text-stone-300 hover:text-rose-400"
                        title="Decline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accepted Friends */}
          <div>
            <h2 className="text-base font-bold text-white mb-3">
              Your Friends ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <div className="rounded-2xl bg-[#1a0c10]/60 border border-rose-950/70 p-8 text-center text-sm text-stone-400">
                You haven’t added any friends yet. Search for members to unlock private watchlists and shared watchlists!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {friends.map((f) => (
                  <div
                    key={f.friendshipId}
                    className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#1a0c10] border border-rose-950/70"
                  >
                    <Link
                      to={`/profile/${f.user.username}`}
                      className="flex items-center gap-3 min-w-0 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-300 font-bold text-sm shrink-0">
                        {(f.user.displayName || f.user.username)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-white group-hover:text-rose-400 truncate">
                          {f.user.displayName || f.user.username}
                        </div>
                        <div className="text-xs text-stone-400 truncate">
                          @{f.user.username}
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(f.friendshipId)}
                      className="p-2 rounded-lg text-stone-500 hover:text-rose-400"
                      title="Remove friend"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
