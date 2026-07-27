const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  
  // type a message
  await page.fill('input[type="text"]', 'hello');
  // press enter
  await page.press('input[type="text"]', 'Enter');
  
  await page.waitForTimeout(5000);
  await browser.close();
})();
