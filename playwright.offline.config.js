import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e-offline', workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH ? {
      executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader'],
    } : {},
  },
  webServer: { command: 'npm run preview -- --host 0.0.0.0 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
})
