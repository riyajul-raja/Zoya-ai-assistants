const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));
  page.on('response', response => {
    if (response.url().includes('/api/chat')) {
      console.log('API RES:', response.url(), response.status());
    }
  });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000); // Wait for load
  
  await page.evaluate(async () => {
    try {
      // Find lock button
      const lockBtn = document.querySelector('button'); 
      // the lock button might be the first button or a specific one. Let's just click all buttons if we can't find it
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.innerText.includes('TAP TO SCAN') || btn.innerHTML.includes('lucide-fingerprint')) {
          btn.click();
        }
      }
      
      // wait a bit
      await new Promise(r => setTimeout(r, 2000));
      
      const chatInput = document.querySelector('textarea, input[type="text"]');
      if (chatInput) {
        chatInput.value = 'hello';
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        const sendBtn = document.querySelector('button[title*="Send"]');
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
