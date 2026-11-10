import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'
import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const config = JSON.parse(readFileSync(new URL('./app-config.json', import.meta.url), 'utf8'));
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const endpoint = new URL(env.VITE_API_URL ?? config.apiUrl);
  if (command === 'build' && (endpoint.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))) {
    throw new Error('Release builds require a hosted HTTPS VITE_API_URL. Localhost is for development only.');
  }
  return {
  base: './',
  plugins: [
    react(), tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  };
})
