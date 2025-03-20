import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/users': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/api/tasks': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/api/activity-logs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
