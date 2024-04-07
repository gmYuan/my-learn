import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import importPlugin from 'vite-plugin-import';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), importPlugin({
    babelImportPluginOptions: [
      {
        libraryName: 'antd',
        libraryDirectory: 'es',
        style: 'css',
      }
    ]
  })],
});
