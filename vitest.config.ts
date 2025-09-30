import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const filePath = fileURLToPath(import.meta.url);
const dir = dirname(filePath);

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(dir, 'src'),
    },
  },
  test: {
    environment: 'node',
  },
});
