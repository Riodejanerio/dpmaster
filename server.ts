import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';

const db = new Database('progress.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS completed_days (
    day INTEGER PRIMARY KEY
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/progress', (req, res) => {
    try {
      const rows = db.prepare('SELECT day FROM completed_days').all() as { day: number }[];
      const days = rows.map(row => row.day);
      res.json(days);
    } catch (error) {
      console.error('Error fetching progress:', error);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  });

  app.post('/api/progress', (req, res) => {
    try {
      const { day, completed } = req.body;
      if (typeof day !== 'number' || typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'Invalid input' });
      }

      if (completed) {
        db.prepare('INSERT OR IGNORE INTO completed_days (day) VALUES (?)').run(day);
      } else {
        db.prepare('DELETE FROM completed_days WHERE day = ?').run(day);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating progress:', error);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    // But for this environment, we mostly care about the dev setup as per instructions
    // If needed, we would serve static files here.
    // For now, assuming dev environment or that build step handles static serving if separate.
    // However, the instructions say "All compilation must be handled by this single command" (npm run build).
    // And "For SPAs, the system auto-injects a static file server".
    // But we are making a full-stack app now.
    // So we should probably serve static files if in production.
    // But the instructions for Full-Stack say "Set the start script... to node server.ts".
    // So we should handle static serving.
    const path = await import('path');
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
