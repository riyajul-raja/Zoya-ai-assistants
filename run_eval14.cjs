const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('response', async response => {
    if (response.url().includes('/api/chat/stream')) {
      console.log('API RES URL:', response.url());
      console.log('API RES STATUS:', response.status());
    }
  });
  page.on('console', msg => {
    if(msg.text().includes('Zoya') || msg.text().includes('API') || msg.text().includes('error')) console.log('BROWSER LOG:', msg.text());
  });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000); 
  
  await page.fill('input[type="password"]', '#zoya');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  await page.click('#keyboard-toggle-btn');
  await page.waitForTimeout(1000);
  
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
  
  await page.waitForTimeout(10000);
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('PAGE TEXT SNIPPET:', pageText.replace(/\n/g, ' ').substring(0, 500));
  
  await browser.close();
})();
