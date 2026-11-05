import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const nodeModuleShim = path.resolve(__dirname, 'src/shims/node-module.ts')

// Vite externalizes node:module before aliases. The UI bundle calls
// createRequire while the module is evaluated, so resolve it first.
function shimNodeModule(): Plugin {
  return {
    name: 'shim-node-module',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'node:module' || source === 'module') return nodeModuleShim
    },
  }
}
// Headless visual checks (plain Chrome, no Electron preload): inject a
// window.electronAPI stub so the renderer can boot. Never active in
// normal dev or builds — gated on DF_HEADLESS_STUB=1.
function headlessStub(): Plugin {
  return {
    name: 'df-headless-stub',
    transformIndexHtml(html) {
      if (process.env.DF_HEADLESS_STUB !== '1') return html
      return html.replace(
        '<head>',
        '<head><script src="/headless-stub.js"></script>',
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [shimNodeModule(), react(), tailwindcss(), headlessStub()],
  base: './',
  resolve: {
    alias: {
      '@framework': path.resolve(__dirname, 'src/live2d/framework'),
      'node:module': path.resolve(__dirname, 'src/shims/node-module.ts'),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
})
