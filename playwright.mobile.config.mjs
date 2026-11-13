import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',
 testMatch:'*.mobile.mjs',
 timeout:30000,
 use:{...devices['Pixel 7'],browserName:'chromium',headless:true},
 webServer:{command:'python3 -m http.server 8765 --directory dist --bind 127.0.0.1',url:'http://127.0.0.1:8765',reuseExistingServer:false,timeout:30000},
 reporter:'list'
});
