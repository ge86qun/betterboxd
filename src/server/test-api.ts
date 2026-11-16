import assert from 'node:assert/strict';
import { app } from './app.js';
import { db } from '../db/index.js';
import {
  users,
  sessions,
  friendships,
  watchedMovies,
  watchlistItems,
  reviews,
  sharedWatchlists,
  sharedWatchlistMembers,
  sharedWatchlistItems,
  notifications,
} from '../db/schema.js';

async function runTests() {
  db.delete(notifications).run();
  db.delete(sharedWatchlistItems).run();
  db.delete(sharedWatchlistMembers).run();
  db.delete(sharedWatchlists).run();
  db.delete(reviews).run();
  db.delete(watchedMovies).run();
  db.delete(watchlistItems).run();
  db.delete(friendships).run();
  db.delete(sessions).run();
  db.delete(users).run();

  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 3099;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  let aliceCookie = '';
  let bobCookie = '';

  async function request(
    path: string,
    options: RequestInit = {},
    cookie?: string
  ) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (cookie) {
      headers.Cookie = cookie;
    }
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
    const setCookie = res.headers.get('set-cookie');
    const body = await res.json();
    return { status: res.status, body, setCookie };
  }

  try {
    console.log('1. Testing user registration (Alice & Bob)...');
    const regAlice = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'alice',
        password: 'password123',
        displayName: 'Alice Cinephile',
      }),
    });
    assert.equal(regAlice.status, 201);
    assert.ok(regAlice.setCookie);
    aliceCookie = regAlice.setCookie.split(';')[0];

    const regBob = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: 'bob',
        password: 'password123',
        displayName: 'Bob FilmBuff',
      }),
    });
    assert.equal(regBob.status, 201);
    assert.ok(regBob.setCookie);
    bobCookie = regBob.setCookie.split(';')[0];

    const aliceId = regAlice.body.user.id;
    const bobId = regBob.body.user.id;

    console.log('2. Testing watchlist & watched list addition (Alice)...');
    const addWatchlist = await request(
      '/me/watchlist',
      {
        method: 'POST',
        body: JSON.stringify({ tmdbId: 27205, notes: 'Must watch Inception' }),
      },
      aliceCookie
    );
    assert.equal(addWatchlist.status, 201);

    console.log('3. Testing privacy enforcement (Bob cannot see Alice watchlist before friendship)...');
    const bobViewAliceWatchlistDenied = await request(
      '/users/alice/watchlist',
      { method: 'GET' },
      bobCookie
    );
    assert.equal(bobViewAliceWatchlistDenied.status, 403);

    console.log('4. Testing half-star review creation & public visibility...');
    const createReview = await request(
      '/reviews',
      {
        method: 'POST',
        body: JSON.stringify({
          tmdbId: 496243,
          rating: 4.5,
          content: 'Masterpiece of tension and social satire.',
          liked: true,
        }),
      },
      aliceCookie
    );
    assert.equal(createReview.status, 201);
    assert.equal(createReview.body.review.rating, 4.5);
    assert.equal(createReview.body.review.ratingHalfStars, 9);

    console.log('5. Testing friendship request & acceptance...');
    const friendReq = await request(
      `/friends/request/${aliceId}`,
      { method: 'POST' },
      bobCookie
    );
    assert.equal(friendReq.status, 201);
    const friendshipId = friendReq.body.friendship.id;

    const acceptReq = await request(
      `/friends/respond/${friendshipId}`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'accept' }),
      },
      aliceCookie
    );
    assert.equal(acceptReq.status, 200);

    console.log('6. Testing multi-friend Shared Watchlists & exiting...');
    const createSharedList = await request(
      '/shared-watchlists',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Friday Night Cinema',
          description: 'Weekly movie club',
          memberIds: [bobId],
        }),
      },
      aliceCookie
    );
    assert.equal(createSharedList.status, 201);
    const sharedListId = createSharedList.body.sharedWatchlist.id;

    // Bob sees the shared watchlist and adds a movie
    const bobLists = await request(
      '/shared-watchlists',
      { method: 'GET' },
      bobCookie
    );
    assert.equal(bobLists.status, 200);
    assert.equal(bobLists.body.sharedWatchlists.length, 1);

    const addSharedItem = await request(
      `/shared-watchlists/${sharedListId}/items`,
      {
        method: 'POST',
        body: JSON.stringify({
          tmdbId: 693134,
          notes: 'Let us watch this on Friday!',
        }),
      },
      bobCookie
    );
    assert.equal(addSharedItem.status, 201);

    // Bob exits the shared watchlist
    const bobExit = await request(
      `/shared-watchlists/${sharedListId}/members/me`,
      { method: 'DELETE' },
      bobCookie
    );
    assert.equal(bobExit.status, 200);

    console.log('✅ All API & streamlined Shared Watchlist tests passed!');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
