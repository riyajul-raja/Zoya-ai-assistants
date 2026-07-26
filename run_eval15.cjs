const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if(msg.text().includes('Zoya') || msg.text().includes('API') || msg.text().includes('Error')) console.log('BROWSER LOG:', msg.text());
  });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000); 
  
  // Login
  await page.fill('input[type="password"]', '#zoya');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  // Switch to chat
  await page.click('#keyboard-toggle-btn');
  await page.waitForTimeout(1000);
  
  // Send message
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
  
  const pageText = await page.evaluate(() => document.body.innerText);
  console.log('CHAT TEST PAGE TEXT:', pageText.replace(/\n/g, ' ').substring(0, 300));
  
  // Go back to voice mode
  await page.click('#keyboard-toggle-btn');
  await page.waitForTimeout(1000);
  
  // Click start session
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text && text.includes('Start Session')) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(3000);
  console.log('VOICE TEST LOGS DONE');
  
  await browser.close();
})();
