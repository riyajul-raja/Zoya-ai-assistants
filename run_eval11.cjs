const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('request', request => console.log('REQ:', request.method(), request.url()));
  page.on('requestfinished', request => {
    if (request.url().includes('/api/chat')) {
      console.log('REQ FINISHED:', request.url(), request.response().status());
    }
  });
  page.on('requestfailed', request => {
    if (request.url().includes('/api/chat')) {
      console.log('REQ FAILED:', request.url(), request.failure().errorText);
    }
  });
  page.on('console', msg => {
    if(msg.text().includes('Zoya')) console.log('BROWSER LOG:', msg.text());
  });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000); 
  
  // Fill passkey
  await page.fill('input[type="password"]', '#zoya');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  
  await page.click('#keyboard-toggle-btn');
  await page.waitForTimeout(500);
  
  const textareas = await page.$$('textarea');
  if (textareas.length > 0) {
    for (const ta of textareas) {
      if (await ta.isVisible()) {
        await ta.click();
        await page.waitForTimeout(500);
        await ta.fill('hello');
        await page.keyboard.press('Enter');
        break;
      }
    }
  }
  
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
