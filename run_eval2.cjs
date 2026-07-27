const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000); 
  
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log(html.substring(1000, 3000));
  
  await browser.close();
})();
