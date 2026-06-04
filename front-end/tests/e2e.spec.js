import { test, expect } from '@playwright/test';

test.describe('Core Pages Render', () => {
  test('Home page loads with header and footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('.site-footer')).toBeVisible();
    await expect(page.locator('.hero-section')).toBeVisible();
  });

  test('Home page has navigation links', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('.main-navigation');
    await expect(nav.locator('a:has-text("Home")')).toBeVisible();
    await expect(nav.locator('a:has-text("Shop")')).toBeVisible();
    await expect(nav.locator('a:has-text("Gallery")')).toBeVisible();
    await expect(nav.locator('a:has-text("Contact")')).toBeVisible();
  });

  test('Shop page loads with sidebar', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.locator('.shop-title')).toContainText('Shop');
    await expect(page.locator('.shop-sidebar')).toBeVisible();
    await expect(page.locator('.shop-content')).toBeVisible();
  });

  test('Shop page has search input', async ({ page }) => {
    await page.goto('/shop');
    const searchInput = page.locator('.shop-sidebar input[type="text"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('charizard');
    await page.locator('button:has-text("Go")').click();
    await page.waitForTimeout(500);
    // Should show search results heading or no results
    await expect(page.locator('.woocommerce-result-count')).toBeVisible();
  });

  test('Gallery page renders with content', async ({ page }) => {
    await page.goto('/gallery');
    await expect(page.locator('.page-intro h1')).toContainText('Gallery');
  });

  test('Contact page renders with form', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1')).toContainText('Contact Us');
    await expect(page.locator('.contact-form form')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
  });

  test('Cart page shows login prompt when not authenticated', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('h2')).toContainText('Log in');
  });

  test('Checkout page shows empty cart message when no items', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.locator('h2').first()).toContainText('Your cart is empty');
  });

  test('Account page shows sign in and register tabs', async ({ page }) => {
    await page.goto('/account');
    await expect(page.getByRole('tab', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Register' })).toBeVisible();
  });

  test('Account page register tab switches to register form', async ({ page }) => {
    await page.goto('/account');
    await page.getByRole('tab', { name: 'Register' }).click();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('404 page renders for unknown route', async ({ page }) => {
    await page.goto('/this-does-not-exist-12345');
    await expect(page.locator('.error-404')).toBeVisible();
  });

  test('Privacy policy page renders', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('.page-title')).toContainText('Privacy Policy');
  });

  test('Terms page renders', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('.page-title')).toContainText('Terms');
  });

  test('Shipping page renders', async ({ page }) => {
    await page.goto('/shipping');
    await expect(page.locator('.page-title')).toContainText('Shipping');
  });

  test('Refund page renders', async ({ page }) => {
    await page.goto('/refund');
    await expect(page.locator('.page-title')).toContainText('Refund');
  });

  test('Admin page shows access denied when not admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('h2')).toContainText('Admin Access Required');
  });

  test('SEO title is set on home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Mecville/);
  });

  test('SEO title is set on shop page', async ({ page }) => {
    await page.goto('/shop');
    await expect(page).toHaveTitle(/Shop.*Mecville/);
  });

  test('SEO title is set on contact page', async ({ page }) => {
    await page.goto('/contact');
    await expect(page).toHaveTitle(/Contact.*Mecville/);
  });

  test('Header cart icon is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.header-cart')).toBeVisible();
  });

  test('Header account icon is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[aria-label="My account"]')).toBeVisible();
  });

  test('Footer has legal links', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('.site-footer');
    await expect(footer.locator('a[href="/privacy"]')).toBeVisible();
    await expect(footer.locator('a[href="/terms"]')).toBeVisible();
    await expect(footer.locator('a[href="/shipping"]')).toBeVisible();
    await expect(footer.locator('a[href="/refund"]')).toBeVisible();
  });

  test('Mobile menu toggle is hidden on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const toggle = page.locator('.menu-toggle');
    await expect(toggle).not.toBeVisible();
  });

  test('Mobile menu toggle is visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto('/');
    const toggle = page.locator('.menu-toggle');
    await expect(toggle).toBeVisible();
  });

  test('Shop category links navigate correctly', async ({ page }) => {
    await page.goto('/shop');
    const sidebar = page.locator('.shop-sidebar');
    await expect(sidebar.locator('a[href="/shop"]')).toBeVisible();
  });

  test('Logo links to home page', async ({ page }) => {
    await page.goto('/shop');
    await page.locator('.brand-logo').click();
    await expect(page).toHaveURL('/');
  });
});
