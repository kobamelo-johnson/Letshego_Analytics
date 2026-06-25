const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    const filePath = `file:///${path.resolve('index.html').replace(/\\/g, '/')}`;
    console.log('Navigating to', filePath);
    
    await page.goto(filePath);
    
    console.log('Typing username...');
    await page.fill('#username', 'admin');
    console.log('Typing password...');
    await page.fill('#password', 'Letshego2026!');
    
    console.log('Clicking login...');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    console.log('Checking if login overlay is still there...');
    const overlay = await page.$('#login-overlay');
    if (overlay) {
        console.log('Overlay still exists');
    } else {
        console.log('Overlay removed (logged in successfully)');
    }
    
    await browser.close();
})();
