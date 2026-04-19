import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import clipsHandler from './api/clips.js'

// Simple middleware to handle /api/clips locally in dev mode
const apiPlugin = () => ({
  name: 'api-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url === '/api/clips') {
        // Mock Vercel response object
        const vercelRes = {
          setHeader: (name, value) => res.setHeader(name, value),
          status: (code) => { res.statusCode = code; return vercelRes; },
          json: (data) => res.end(JSON.stringify(data)),
          end: () => res.end()
        };
        try {
          await clipsHandler(req, vercelRes);
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
})
