const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));
  page.on('response', async response => {
    if (response.url().includes('/api/chat/stream')) {
      console.log('API RES:', response.url(), response.status());
    }
  });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000); // Wait for load
  
  await page.evaluate(async () => {
    try {
      const passkeyInput = document.querySelector('input[type="password"]');
      if (passkeyInput) {
        passkeyInput.value = '#zoya';
        passkeyInput.dispatchEvent(new Event('input', { bubbles: true }));
        const form = passkeyInput.closest('form');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    } catch(e) {}
  });
  
  await page.waitForTimeout(3000);
  
  await page.evaluate(async () => {
    try {
      const chatInput = document.querySelector('textarea, input[type="text"]');
      if (chatInput) {
        chatInput.value = 'hello';
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        const sendBtn = document.querySelector('button[title*="Send"], .send-button');
        if (sendBtn) {
          sendBtn.click();
        } else {
          chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        }
      } else {
        console.log("No chat input found");
      }
    } catch(e) {}
  });
  
  await page.waitForTimeout(5000);
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('PAGE TEXT SNIPPET:', pageText.replace(/\n/g, ' ').substring(0, 500));
  
  await browser.close();
})();
