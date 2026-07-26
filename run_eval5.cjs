const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));
  page.on('response', async response => {
    if (response.url().includes('/api/chat') && response.url().includes('localhost')) {
      console.log('API RES URL:', response.url());
      console.log('API RES STATUS:', response.status());
      try {
        const body = await response.text();
        console.log('API BODY:', body);
      } catch(e) {
        console.log('API BODY ERR:', e);
      }
    }
  });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000); 
  
  // Fill passkey
  await page.fill('input[type="password"]', '#zoya');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(2000);
  
  // Try clicking Start Session or similar buttons
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.innerText.includes('Start Session') || btn.innerText.includes('Start')) {
        btn.click();
      }
    }
  });
  
  await page.waitForTimeout(2000);
  
  // Fill chat input
  const textareas = await page.$$('textarea, input[type="text"]');
  if (textareas.length > 0) {
    let clicked = false;
    for (const ta of textareas) {
      if (await ta.isVisible()) {
        await ta.fill('hello');
        clicked = true;
        break;
      }
    }
    if (clicked) {
      await page.keyboard.press('Enter');
    } else {
      console.log('Textarea not visible');
    }
  } else {
    console.log("No chat input found");
  }
  
  await page.waitForTimeout(5000);
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('PAGE TEXT SNIPPET:', pageText.replace(/\n/g, ' ').substring(0, 500));
  
  await browser.close();
})();
