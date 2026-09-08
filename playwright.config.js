const {defineConfig,devices}=require('@playwright/test');
const port=Number(process.env.FINTRACK_TEST_PORT||43117);

module.exports=defineConfig({
  testDir:'./tests/browser',
  fullyParallel:true,
  reporter:process.env.CI?'github':'list',
  use:{baseURL:`http://127.0.0.1:${port}`,trace:'retain-on-failure'},
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-chromium',use:{...devices['Pixel 5']}},
  ],
  webServer:{command:'node scripts/serve.mjs',url:`http://127.0.0.1:${port}`,env:{PORT:String(port)},reuseExistingServer:false},
});
