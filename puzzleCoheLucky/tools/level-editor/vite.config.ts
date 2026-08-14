import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const levelPath = resolve(import.meta.dirname, '../../assets/resources/datas/level.csv');

function levelApi(): Plugin {
  return {
    name: 'level-api',
    configureServer(server) {
      server.middlewares.use('/api/levels', async (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        if (request.method === 'GET') {
          response.end(JSON.stringify({ csv: await readFile(levelPath, 'utf8') }));
          return;
        }
        if (request.method === 'POST') {
          let body = '';
          request.setEncoding('utf8');
          request.on('data', (chunk) => body += chunk);
          request.on('end', async () => {
            try {
              const { csv } = JSON.parse(body) as { csv: string };
              await writeFile(levelPath, csv, 'utf8');
              response.end(JSON.stringify({ ok: true }));
            } catch (error) {
              response.statusCode = 400;
              response.end(JSON.stringify({ error: String(error) }));
            }
          });
          return;
        }
        response.statusCode = 405;
        response.end(JSON.stringify({ error: 'Method not allowed' }));
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), levelApi()],
});
