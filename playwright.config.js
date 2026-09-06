const {defineConfig,devices}=require('@playwright/test');

module.exports=defineConfig({
  testDir:'./tests/browser',
  fullyParallel:true,
  reporter:process.env.CI?'github':'list',
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-chromium',use:{...devices['Pixel 5']}},
  ],
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
});
