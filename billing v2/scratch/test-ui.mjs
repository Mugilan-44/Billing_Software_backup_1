import { chromium } from 'playwright';
import path from 'path';

const __dirname = path.resolve();
const adminEmail = 'testadmin_1780491829149@billing.com';
const adminPassword = 'testpassword123';

const testUi = async () => {
    console.log(`Starting UI test with email: ${adminEmail}`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    try {
        console.log('Navigating to login page...');
        await page.goto('http://localhost:5174/login');
        await page.waitForLoadState('networkidle');

        console.log('Logging in...');
        await page.fill('input[type="email"]', adminEmail);
        await page.fill('input[type="password"]', adminPassword);
        await page.click('button[type="submit"]');

        console.log('Waiting for dashboard to load...');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('Logged in successfully!');

        console.log('Navigating to settings...');
        await page.goto('http://localhost:5174/settings');
        await page.waitForSelector('text=Company Logo');

        // Select the file input inside the Logo Card
        console.log('Uploading image to open cropper...');
        const testImagePath = path.join(__dirname, 'scratch', 'test-image.png');
        
        // Listen to console log to debug
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.error('BROWSER ERROR:', err));

        // Start file chooser listener
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('text=Upload Logo');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(testImagePath);

        console.log('Waiting for cropper modal to open...');
        await page.waitForSelector('text=Crop Image');
        console.log('Cropper modal is open!');

        // Take a screenshot of the open modal
        const modalScreenshotPath = path.join(__dirname, 'scratch', 'screenshot-modal.png');
        await page.screenshot({ path: modalScreenshotPath });
        console.log(`Saved modal screenshot to ${modalScreenshotPath}`);

        // Click crop & upload
        console.log('Clicking Crop & Upload...');
        await page.click('text=Crop & Upload');

        // Wait for modal to close
        await page.waitForSelector('text=Crop Image', { state: 'hidden' });
        console.log('Cropper modal closed successfully.');

        // Take a screenshot of settings after crop
        const croppedScreenshotPath = path.join(__dirname, 'scratch', 'screenshot-cropped.png');
        await page.screenshot({ path: croppedScreenshotPath });
        console.log(`Saved cropped preview screenshot to ${croppedScreenshotPath}`);

        // Click save settings
        console.log('Saving settings...');
        await page.click('text=Save Settings');

        // Wait for success toast/notification
        await page.waitForSelector('text=Settings updated successfully!');
        console.log('Settings saved successfully!');

        // Take a final screenshot
        const savedScreenshotPath = path.join(__dirname, 'scratch', 'screenshot-saved.png');
        await page.screenshot({ path: savedScreenshotPath });
        console.log(`Saved final screenshot to ${savedScreenshotPath}`);

    } catch (error) {
        console.error('Test failed:', error);
        const errorScreenshotPath = path.join(__dirname, 'scratch', 'screenshot-error.png');
        await page.screenshot({ path: errorScreenshotPath });
        console.log(`Saved error screenshot to ${errorScreenshotPath}`);
    } finally {
        await browser.close();
    }
};

testUi();
