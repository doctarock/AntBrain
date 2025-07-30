import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/generate', createProxyMiddleware({
  target: 'http://localhost:11434',
  changeOrigin: true,
  pathRewrite: { '^/api/generate': '/api/generate' }
}));

app.listen(3000, () => console.log('Server running at http://localhost:3000'));
