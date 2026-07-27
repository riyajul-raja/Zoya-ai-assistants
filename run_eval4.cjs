const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));
  page.on('response', async response => {
    if (response.url().includes('/api/chat/stream')) {
      console.log('API RES:', response.url(), response.status());
      try {
        const body = await response.text();
        console.log('API BODY:', body);
      } catch(e) {}
    }
  });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000); 
  
  // Fill passkey
  await page.fill('input[type="password"]', '#zoya');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(3000);
  
  // Try to find the chat input
  const textareas = await page.$$('textarea, input[type="text"]');
  if (textareas.length > 0) {
    // Fill the first visible textarea
    await textareas[0].fill('hello');
    // Find the send button
    await page.keyboard.press('Enter');
  } else {
    console.log("No chat input found");
  }
  
  await page.waitForTimeout(5000);
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('PAGE TEXT SNIPPET:', pageText.replace(/\n/g, ' ').substring(0, 500));
  
  await browser.close();
})();
