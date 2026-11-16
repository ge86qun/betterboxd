import { app } from './app.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🎬 Betterboxd server listening on http://${HOST}:${PORT} (LAN: http://192.168.178.201:${PORT})`);
});
