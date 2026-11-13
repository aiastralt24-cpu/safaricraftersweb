import {expect, test} from '@playwright/test';
import {socialLinks} from '../lib/quick-actions';

for (const touch of [false, true]) {
  test.describe(touch ? 'mobile social links' : 'desktop social links', () => {
    test.use({hasTouch: touch, viewport: touch ? {width:390,height:844} : {width:1440,height:950}});
    test('links open before focus loss dismisses the panel', async ({page, context}) => {
      // Verify browser navigation without relying on social-network login or anti-bot pages.
      await context.route(/https:\/\/www\.(instagram|facebook)\.com\/.*/, route => route.fulfill({body:'Social destination reached',contentType:'text/html'}));
      await page.goto('/destinations/kamchatka', {waitUntil:'domcontentloaded'});
      await expect(page.locator('.quick-actions[data-ready=true]')).toBeVisible();
      for (const [name, url] of [['Instagram',socialLinks.instagram],['Facebook',socialLinks.facebook]]) {
        await page.locator('.quick-actions button').click();
        const link=page.locator('.quick-actions-social').getByRole('link',{name:new RegExp(name)});
        await expect(link).toHaveAttribute('href',url);
        const popup=context.waitForEvent('page');
        if (touch) await link.tap(); else await link.click();
        const tab=await popup;
        await expect(tab).toHaveURL(url);
        await tab.close();
        await page.keyboard.press('Escape');
        await expect(page.locator('.quick-actions button')).toBeFocused();
      }
    });
  });
}
