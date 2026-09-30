const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function captureUI() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle0', timeout: 15000 });

  const screenshotPath = path.resolve(__dirname, '../public/assets/ui_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });

  console.log('UI screenshot captured at:', screenshotPath);
  await browser.close();
}

captureUI().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
