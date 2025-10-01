import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_PRODUCTS, DataGenerators } from '../utils/test-helpers';

test.describe('E-commerce - Shop and Checkout', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test.describe('Product Catalog', () => {
    test('should display products correctly', async ({ page }) => {
      await helpers.navigateToShop();

      // Should show products grid
      await helpers.expectElementVisible('products-grid');
      
      const products = page.locator('[data-testid="product-card"]');
      const productCount = await products.count();
      expect(productCount).toBeGreaterThan(0);

      // Each product should have required elements
      for (let i = 0; i < Math.min(productCount, 3); i++) {
        const product = products.nth(i);
        
        await expect(product.locator('[data-testid="product-name"]')).toBeVisible();
        await expect(product.locator('[data-testid="product-price"]')).toBeVisible();
        await expect(product.locator('[data-testid="product-image"]')).toBeVisible();
        await expect(product.locator('[data-testid="add-to-cart-button"]')).toBeVisible();
      }
    });

    test('should filter products by category', async ({ page }) => {
      await helpers.navigateToShop();

      // Click on a category filter
      await page.click('[data-testid="category-filter"]');
      await page.click('[data-testid="category-courses"]');

      await helpers.waitForLoadingToFinish();

      // All visible products should be in the selected category
      const products = page.locator('[data-testid="product-card"]');
      const count = await products.count();

      for (let i = 0; i < count; i++) {
        const productCategory = products.nth(i).locator('[data-testid="product-category"]');
        await expect(productCategory).toContainText('Courses');
      }
    });

    test('should search products by name', async ({ page }) => {
      await helpers.navigateToShop();

      const searchTerm = 'English';
      
      // Enter search term
      await page.fill('[data-testid="search-input"]', searchTerm);
      await page.press('[data-testid="search-input"]', 'Enter');

      await helpers.waitForLoadingToFinish();

      // All visible products should contain search term
      const products = page.locator('[data-testid="product-card"]');
      const count = await products.count();

      for (let i = 0; i < count; i++) {
        const productName = await products.nth(i).locator('[data-testid="product-name"]').textContent();
        expect(productName?.toLowerCase()).toContain(searchTerm.toLowerCase());
      }
    });

    test('should sort products by price', async ({ page }) => {
      await helpers.navigateToShop();

      // Sort by price ascending
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('[data-testid="sort-price-asc"]');

      await helpers.waitForLoadingToFinish();

      // Get all product prices
      const products = page.locator('[data-testid="product-card"]');
      const count = await products.count();
      const prices: number[] = [];

      for (let i = 0; i < count; i++) {
        const priceText = await products.nth(i).locator('[data-testid="product-price"]').textContent();
        const price = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');
        prices.push(price);
      }

      // Verify prices are in ascending order
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });
  });

  test.describe('Product Details', () => {
    test('should display product details correctly', async ({ page }) => {
      await helpers.navigateToShop();

      // Click on first product
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();

      // Should navigate to product details page
      await helpers.expectUrl(/\/shop\/product\/[a-zA-Z0-9]+/);

      // Should show product details
      await helpers.expectElementVisible('product-details');
      await helpers.expectElementVisible('product-title');
      await helpers.expectElementVisible('product-description');
      await helpers.expectElementVisible('product-price');
      await helpers.expectElementVisible('product-images');
      await helpers.expectElementVisible('add-to-cart-button');
    });

    test('should handle product with scheduling requirements', async ({ page }) => {
      await helpers.navigateToShop();

      // Find a product that requires scheduling
      const products = page.locator('[data-testid="product-card"]');
      const count = await products.count();

      for (let i = 0; i < count; i++) {
        const product = products.nth(i);
        const requiresScheduling = await product.getAttribute('data-requires-scheduling');
        
        if (requiresScheduling === 'true') {
          await product.click();
          
          // Should show scheduling section
          await helpers.expectElementVisible('scheduling-section');
          await helpers.expectElementVisible('schedule-selector');
          break;
        }
      }
    });

    test('should show related products', async ({ page }) => {
      await helpers.navigateToShop();

      // Click on first product
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();

      // Should show related products section
      await helpers.expectElementVisible('related-products');
      
      const relatedProducts = page.locator('[data-testid="related-product"]');
      const relatedCount = await relatedProducts.count();
      
      expect(relatedCount).toBeGreaterThan(0);
    });
  });

  test.describe('Shopping Cart', () => {
    test('should add product to cart', async ({ page }) => {
      await helpers.navigateToShop();

      // Add first product to cart
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      const productName = await firstProduct.locator('[data-testid="product-name"]').textContent();
      
      await firstProduct.locator('[data-testid="add-to-cart-button"]').click();

      // Should show success message
      await helpers.waitForToast('Added to cart');

      // Cart count should increase
      const cartCount = page.locator('[data-testid="cart-count"]');
      await expect(cartCount).toContainText('1');

      // Open cart
      await page.click('[data-testid="cart-button"]');
      await helpers.expectElementVisible('cart-dropdown');

      // Product should be in cart
      await helpers.expectElementText('cart-items', productName || '');
    });

    test('should update product quantity in cart', async ({ page }) => {
      await helpers.navigateToShop();

      // Add product to cart
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.locator('[data-testid="add-to-cart-button"]').click();
      await helpers.waitForToast('Added to cart');

      // Open cart
      await page.click('[data-testid="cart-button"]');

      // Increase quantity
      await page.click('[data-testid="increase-quantity-button"]');

      // Quantity should be 2
      const quantity = page.locator('[data-testid="item-quantity"]');
      await expect(quantity).toContainText('2');

      // Cart total should update
      await helpers.expectElementVisible('cart-total');
    });

    test('should remove product from cart', async ({ page }) => {
      await helpers.navigateToShop();

      // Add product to cart
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.locator('[data-testid="add-to-cart-button"]').click();
      await helpers.waitForToast('Added to cart');

      // Open cart
      await page.click('[data-testid="cart-button"]');

      // Remove item
      await page.click('[data-testid="remove-item-button"]');

      // Should show confirmation
      await helpers.waitForDialog('confirm-remove-dialog');
      await page.click('[data-testid="confirm-remove-button"]');

      // Cart should be empty
      await helpers.expectElementText('cart-empty-message', 'Your cart is empty');
      
      // Cart count should be 0
      const cartCount = page.locator('[data-testid="cart-count"]');
      await expect(cartCount).toContainText('0');
    });

    test('should persist cart across sessions', async ({ page }) => {
      await helpers.loginAsStudent();
      await helpers.navigateToShop();

      // Add product to cart
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      const productName = await firstProduct.locator('[data-testid="product-name"]').textContent();
      
      await firstProduct.locator('[data-testid="add-to-cart-button"]').click();
      await helpers.waitForToast('Added to cart');

      // Refresh page
      await page.reload();

      // Cart should still contain the item
      await page.click('[data-testid="cart-button"]');
      await helpers.expectElementText('cart-items', productName || '');
    });
  });

  test.describe('Checkout Process', () => {
    test('should complete checkout for regular product', async ({ page }) => {
      await helpers.loginAsStudent();
      await helpers.navigateToShop();

      // Add product to cart
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.locator('[data-testid="add-to-cart-button"]').click();
      await helpers.waitForToast('Added to cart');

      // Proceed to checkout
      await helpers.proceedToCheckout();

      // Should navigate to checkout page
      await helpers.expectUrl(/\/checkout/);

      // Should show checkout form
      await helpers.expectElementVisible('checkout-form');
      await helpers.expectElementVisible('order-summary');

      // Fill checkout form (if required)
      const billingForm = page.locator('[data-testid="billing-form"]');
      if (await billingForm.isVisible()) {
        await helpers.fillForm({
          'billing-name': 'Test User',
          'billing-email': 'test@example.com',
          'billing-address': '123 Test St',
          'billing-city': 'Test City',
          'billing-zip': '12345'
        });
      }

      // Complete checkout
      await page.click('[data-testid="complete-checkout-button"]');

      // Should show success page
      await helpers.expectUrl(/\/checkout\/success/);
      await helpers.expectElementVisible('checkout-success');
      await helpers.expectElementText('success-message', 'Order completed successfully');
    });

    test('should handle checkout with scheduling', async ({ page }) => {
      await helpers.loginAsStudent();
      await helpers.navigateToShop();

      // Find and add schedulable product
      const products = page.locator('[data-testid="product-card"]');
      const count = await products.count();

      for (let i = 0; i < count; i++) {
        const product = products.nth(i);
        const requiresScheduling = await product.getAttribute('data-requires-scheduling');
        
        if (requiresScheduling === 'true') {
          await product.click();
          
          // Select schedule slots
          await helpers.expectElementVisible('schedule-selector');
          
          const availableSlots = page.locator('[data-testid="available-slot"]');
          const slotCount = await availableSlots.count();
          
          if (slotCount > 0) {
            // Select first available slot
            await availableSlots.first().click();
            
            // Add to cart
            await page.click('[data-testid="add-to-cart-button"]');
            await helpers.waitForToast('Added to cart');
            
            // Proceed to checkout
            await helpers.proceedToCheckout();
            
            // Should show selected schedule in order summary
            await helpers.expectElementVisible('scheduled-slots');
            
            // Complete checkout
            await page.click('[data-testid="complete-checkout-button"]');
            
            // Should show success with schedule confirmation
            await helpers.expectUrl(/\/checkout\/success/);
            await helpers.expectElementVisible('schedule-confirmation');
          }
          break;
        }
      }
    });

    test('should apply coupon code', async ({ page }) => {
      await helpers.loginAsStudent();
      await helpers.navigateToShop();

      // Add product to cart
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.locator('[data-testid="add-to-cart-button"]').click();
      await helpers.waitForToast('Added to cart');

      // Proceed to checkout
      await helpers.proceedToCheckout();

      // Apply coupon
      await page.click('[data-testid="apply-coupon-button"]');
      await page.fill('[data-testid="coupon-input"]', 'TEST10');
      await page.click('[data-testid="apply-coupon-submit"]');

      // Should show discount applied
      await helpers.waitForToast('Coupon applied successfully');
      await helpers.expectElementVisible('discount-line');
      
      // Total should be updated
      const originalTotal = await page.locator('[data-testid="subtotal"]').textContent();
      const finalTotal = await page.locator('[data-testid="final-total"]').textContent();
      
      expect(finalTotal).not.toBe(originalTotal);
    });

    test('should handle invalid coupon code', async ({ page }) => {
      await helpers.loginAsStudent();
      await helpers.navigateToShop();

      // Add product to cart
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.locator('[data-testid="add-to-cart-button"]').click();
      await helpers.waitForToast('Added to cart');

      // Proceed to checkout
      await helpers.proceedToCheckout();

      // Apply invalid coupon
      await page.click('[data-testid="apply-coupon-button"]');
      await page.fill('[data-testid="coupon-input"]', 'INVALID');
      await page.click('[data-testid="apply-coupon-submit"]');

      // Should show error message
      await helpers.waitForToast('Invalid coupon code');
      
      // No discount should be applied
      await helpers.expectElementHidden('discount-line');
    });
  });

  test.describe('Order Management', () => {
    test('should view order history', async ({ page }) => {
      await helpers.loginAsStudent();
      await page.goto('/dashboard/orders');

      // Should show orders list
      await helpers.expectElementVisible('orders-list');
      
      const orders = page.locator('[data-testid="order-item"]');
      const orderCount = await orders.count();

      // Each order should show required information
      for (let i = 0; i < Math.min(orderCount, 3); i++) {
        const order = orders.nth(i);
        
        await expect(order.locator('[data-testid="order-number"]')).toBeVisible();
        await expect(order.locator('[data-testid="order-date"]')).toBeVisible();
        await expect(order.locator('[data-testid="order-status"]')).toBeVisible();
        await expect(order.locator('[data-testid="order-total"]')).toBeVisible();
      }
    });

    test('should view order details', async ({ page }) => {
      await helpers.loginAsStudent();
      await page.goto('/dashboard/orders');

      const orders = page.locator('[data-testid="order-item"]');
      const orderCount = await orders.count();

      if (orderCount > 0) {
        // Click on first order
        await orders.first().click();

        // Should navigate to order details
        await helpers.expectUrl(/\/dashboard\/orders\/[a-zA-Z0-9]+/);

        // Should show order details
        await helpers.expectElementVisible('order-details');
        await helpers.expectElementVisible('order-items');
        await helpers.expectElementVisible('billing-information');
        
        // If order has scheduling, should show schedule details
        const scheduleSection = page.locator('[data-testid="schedule-details"]');
        if (await scheduleSection.isVisible()) {
          await helpers.expectElementVisible('scheduled-sessions');
        }
      }
    });

    test('should download invoice', async ({ page }) => {
      await helpers.loginAsStudent();
      await page.goto('/dashboard/orders');

      const orders = page.locator('[data-testid="order-item"]');
      const orderCount = await orders.count();

      if (orderCount > 0) {
        // Click on first order
        await orders.first().click();

        // Click download invoice button
        const downloadButton = page.locator('[data-testid="download-invoice-button"]');
        if (await downloadButton.isVisible()) {
          // Set up download listener
          const downloadPromise = page.waitForEvent('download');
          await downloadButton.click();
          
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf/);
        }
      }
    });
  });

  test.describe('Payment Processing', () => {
    test('should handle successful payment', async ({ page }) => {
      await helpers.loginAsStudent();
      await helpers.navigateToShop();

      // Add product to cart and proceed to checkout
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.locator('[data-testid="add-to-cart-button"]').click();
      await helpers.waitForToast('Added to cart');
      await helpers.proceedToCheckout();

      // Fill payment information (mock)
      await page.click('[data-testid="payment-method-card"]');
      
      const paymentForm = page.locator('[data-testid="payment-form"]');
      if (await paymentForm.isVisible()) {
        await helpers.fillForm({
          'card-number': '4242424242424242',
          'card-expiry': '12/25',
          'card-cvc': '123',
          'card-name': 'Test User'
        });
      }

      // Complete payment
      await page.click('[data-testid="complete-payment-button"]');

      // Should show payment processing
      await helpers.expectElementVisible('payment-processing');

      // Should redirect to success page
      await helpers.expectUrl(/\/checkout\/success/);
      await helpers.expectElementText('payment-status', 'Payment successful');
    });

    test('should handle payment failure', async ({ page }) => {
      await helpers.loginAsStudent();
      await helpers.navigateToShop();

      // Add product to cart and proceed to checkout
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.locator('[data-testid="add-to-cart-button"]').click();
      await helpers.waitForToast('Added to cart');
      await helpers.proceedToCheckout();

      // Use declined card number (mock)
      await page.click('[data-testid="payment-method-card"]');
      
      const paymentForm = page.locator('[data-testid="payment-form"]');
      if (await paymentForm.isVisible()) {
        await helpers.fillForm({
          'card-number': '4000000000000002', // Declined card
          'card-expiry': '12/25',
          'card-cvc': '123',
          'card-name': 'Test User'
        });
      }

      // Attempt payment
      await page.click('[data-testid="complete-payment-button"]');

      // Should show payment error
      await helpers.waitForToast('Payment failed');
      await helpers.expectElementVisible('payment-error');
      
      // Should remain on checkout page
      await helpers.expectUrl(/\/checkout/);
    });
  });

  test.describe('Wishlist', () => {
    test('should add product to wishlist', async ({ page }) => {
      await helpers.loginAsStudent();
      await helpers.navigateToShop();

      // Add first product to wishlist
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      const productName = await firstProduct.locator('[data-testid="product-name"]').textContent();
      
      await firstProduct.locator('[data-testid="add-to-wishlist-button"]').click();

      // Should show success message
      await helpers.waitForToast('Added to wishlist');

      // Go to wishlist
      await page.goto('/dashboard/wishlist');

      // Product should be in wishlist
      await helpers.expectElementText('wishlist-items', productName || '');
    });

    test('should remove product from wishlist', async ({ page }) => {
      await helpers.loginAsStudent();
      await page.goto('/dashboard/wishlist');

      const wishlistItems = page.locator('[data-testid="wishlist-item"]');
      const itemCount = await wishlistItems.count();

      if (itemCount > 0) {
        const firstItem = wishlistItems.first();
        const productName = await firstItem.locator('[data-testid="product-name"]').textContent();

        // Remove item
        await firstItem.locator('[data-testid="remove-from-wishlist-button"]').click();

        // Should show success message
        await helpers.waitForToast('Removed from wishlist');

        // Item should be removed
        await expect(page.locator('[data-testid="wishlist-items"]')).not.toContainText(productName || '');
      }
    });

    test('should move item from wishlist to cart', async ({ page }) => {
      await helpers.loginAsStudent();
      await page.goto('/dashboard/wishlist');

      const wishlistItems = page.locator('[data-testid="wishlist-item"]');
      const itemCount = await wishlistItems.count();

      if (itemCount > 0) {
        // Move first item to cart
        await wishlistItems.first().locator('[data-testid="move-to-cart-button"]').click();

        // Should show success message
        await helpers.waitForToast('Moved to cart');

        // Cart count should increase
        const cartCount = page.locator('[data-testid="cart-count"]');
        await expect(cartCount).toContainText('1');
      }
    });
  });
});
