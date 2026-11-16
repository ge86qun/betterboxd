import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { attachAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { moviesRouter } from './routes/movies.js';
import { usersRouter, friendsRouter } from './routes/users.js';
import { meListsRouter } from './routes/meLists.js';
import { reviewsRouter } from './routes/reviews.js';
import { sharedWatchlistsRouter } from './routes/sharedWatchlists.js';
import { notificationsRouter } from './routes/notifications.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachAuth);

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'betterboxd-api' });
  });

  // Mount API routes
  app.use('/api/auth', authRouter);
  app.use('/api/movies', moviesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/friends', friendsRouter);
  app.use('/api/me', meListsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/shared-watchlists', sharedWatchlistsRouter);
  app.use('/api/notifications', notificationsRouter);

  // Serve pre-compiled frontend static files from ./dist if present
  const distPath = path.resolve(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    app.use(express.static(distPath));
    app.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(indexHtmlPath);
    });
  }

  return app;
}

export const app = createApp();
