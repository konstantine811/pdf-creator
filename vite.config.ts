import { defineConfig, type Plugin } from 'vite'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function pdfJsAssets(): Plugin {
  const require = createRequire(import.meta.url)
  const root = dirname(require.resolve('pdfjs-dist/package.json'))
  const directories = ['cmaps', 'standard_fonts', 'wasm']

  return {
    name: 'pdfjs-assets',
    configureServer(server) {
      const prefix = `${server.config.base}pdfjs/`
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith(prefix)) {
          const asset = req.url.slice(prefix.length).split('?')[0]
          const [directory, filename, extra] = asset.split('/')
          if (
            directories.includes(directory ?? '') &&
            filename && !extra &&
            readdirSync(join(root, directory!)).includes(filename)
          ) {
            req.url = `/@fs/${join(root, directory!, filename)}`
          }
        }
        next()
      })
    },
    generateBundle() {
      for (const directory of directories) {
        for (const filename of readdirSync(join(root, directory))) {
          this.emitFile({
            type: 'asset',
            fileName: `pdfjs/${directory}/${filename}`,
            source: readFileSync(join(root, directory, filename)),
          })
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pdfJsAssets()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
})
