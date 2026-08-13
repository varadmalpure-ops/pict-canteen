import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

  console.log('Navigating...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  console.log('Page loaded');
  
  // Try to click Google Login
  console.log('Clicking Google...');
  await page.getByRole('button', { name: /Google/i }).click();
  
  await page.waitForTimeout(3000);
  await browser.close();
})();
