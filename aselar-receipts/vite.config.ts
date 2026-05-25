import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const reactCompilerConfig = {
  target: '18',                      // important for React 18
  runtimeModule: 'react-compiler-runtime',  // ← add this line
}

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', reactCompilerConfig],
        ],
      },
    }),
  ],

  assetsInclude: ['**/*.JPEG', '**/*.jpeg', '**/*.jpg', '**/*.JPG'],
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable'],
  },

  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})