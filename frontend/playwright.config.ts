import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    retries: 3,
    use: {
        baseURL: 'http://127.0.0.1:4173',
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
        port: 4173,
        timeout: 120000,
        reuseExistingServer: true,
    },
});
