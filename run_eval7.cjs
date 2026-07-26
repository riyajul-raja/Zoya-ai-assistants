const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000); 
  
  // Fill passkey
  await page.fill('input[type="password"]', '#zoya');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log(html.substring(6000, 8000));
  
  await browser.close();
})();
