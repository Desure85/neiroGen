import { test, expect, Page } from '@playwright/test'

// Test configuration
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@demo.local'
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'password'

// Performance metrics storage
interface PerformanceMetrics {
  pageName: string
  loadTime: number
  ttfb: number
  domContentLoaded: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
}

const performanceResults: PerformanceMetrics[] = []

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  
  // Wait for the form to be loaded and extract CSRF token
  await page.waitForSelector('form')
  
  // Get CSRF token from the page if available
  const csrfToken = await page.evaluate(() => {
    const tokenInput = document.querySelector('input[name="_token"]') || 
                       document.querySelector('input[name="_csrf"]') ||
                       document.querySelector('meta[name="csrf-token"]')
    if (tokenInput instanceof HTMLInputElement) {
      return tokenInput.value
    }
    if (tokenInput instanceof HTMLMetaElement) {
      return tokenInput.content
    }
    return null
  })
  
  const form = page.locator('form')
  await form.getByRole('textbox', { name: /email|you@example.com/i }).fill(ADMIN_EMAIL)
  await form.getByRole('textbox', { name: /пароль|password|•/i }).fill(ADMIN_PASS)
  
  // Submit the form
  await form.getByRole('button', { name: /войти|войти|login|sign in/i }).click()
  
  // Wait for navigation or check for errors
  try {
    await expect(page).toHaveURL(/\/(therapist|admin)/, { timeout: 30000 })
  } catch (e) {
    // If login fails, check if there's a CSRF error
    const pageContent = await page.content()
    if (pageContent.includes('CSRF') || pageContent.includes('token mismatch')) {
      console.log('CSRF token issue detected, retrying with fresh token...')
      await page.goto('/login')
      await page.waitForSelector('form')
      const newForm = page.locator('form')
      await newForm.getByRole('textbox', { name: /email|you@example.com/i }).fill(ADMIN_EMAIL)
      await newForm.getByRole('textbox', { name: /пароль|password|•/i }).fill(ADMIN_PASS)
      await newForm.getByRole('button', { name: /войти|войти|login|sign in/i }).click()
      await expect(page).toHaveURL(/\/(therapist|admin)/, { timeout: 30000 })
    } else {
      throw e
    }
  }
}

// Helper to measure performance metrics
async function measurePerformance(page: Page, pageName: string) {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')
  
  const metrics = await page.evaluate(() => {
    return new Promise<PerformanceMetrics>((resolve) => {
      // Get basic navigation timing
      const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      const paintEntries = performance.getEntriesByType('paint')
      
      const fp = paintEntries.find(e => e.name === 'first-contentful-paint')
      const lcp = paintEntries.find(e => e.name === 'largest-contentful-paint')
      
      // Get CLS
      let cls = 0
      const clsEntries = performance.getEntriesByType('layout-shift') as PerformanceLayoutShift[]
      clsEntries.forEach(entry => {
        if (!entry.hadRecentInput) {
          cls += entry.value
        }
      })
      
      // Get FID (First Input Delay) - only works with user interaction, so we measure INP instead
      const inpEntries = performance.getEntriesByType('first-input') as PerformanceEventTiming[]
      const inp = inpEntries.length > 0 ? inpEntries[0].processingStart - inpEntries[0].startTime : 0
      
      resolve({
        pageName,
        loadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
        ttfb: navigation ? navigation.responseStart - navigation.requestStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : 0,
        firstContentfulPaint: fp ? fp.startTime : 0,
        largestContentfulPaint: lcp ? lcp.startTime : 0,
        cumulativeLayoutShift: cls,
        firstInputDelay: inp
      })
    })
  })
  
  performanceResults.push(metrics)
  console.log(`📊 [${pageName}] Load: ${metrics.loadTime.toFixed(0)}ms, TTFB: ${metrics.ttfb.toFixed(0)}ms, FCP: ${metrics.firstContentfulPaint.toFixed(0)}ms, LCP: ${metrics.largestContentfulPaint.toFixed(0)}ms`)
  
  return metrics
}

// Helper to check accessibility issues
async function checkAccessibility(page: Page, pageName: string) {
  const issues: string[] = []
  
  // Check for images without alt text
  const imagesWithoutAlt = await page.locator('img:not([alt])').count()
  if (imagesWithoutAlt > 0) {
    issues.push(`Found ${imagesWithoutAlt} images without alt text`)
  }
  
  // Check for buttons without accessible names
  const buttonsWithoutLabel = await page.locator('button:not([aria-label]):not([aria-labelledby])').count()
  if (buttonsWithoutLabel > 0) {
    const unlabeledButtons = await page.locator('button:not([aria-label]):not([aria-labelledby])').allInnerTexts()
    issues.push(`Found ${buttonsWithoutLabel} buttons without accessible names: ${unlabeledButtons.slice(0, 3).join(', ')}`)
  }
  
  // Check for form inputs without labels
  const inputsWithoutLabel = await page.locator('input:not([aria-label]):not([aria-labelledby]):not([id])').count()
  if (inputsWithoutLabel > 0) {
    issues.push(`Found ${inputsWithoutLabel} inputs without labels`)
  }
  
  // Check for low contrast (basic check - would need more sophisticated testing in production)
  const problematicColors = await page.evaluate(() => {
    const elements = document.querySelectorAll('*')
    let count = 0
    elements.forEach(el => {
      const style = window.getComputedStyle(el)
      const bg = style.backgroundColor
      const color = style.color
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && color) {
        // Very basic check - just log potential issues
        count++
      }
    })
    return count
  })
  
  if (issues.length > 0) {
    console.log(`♿ [${pageName}] Accessibility issues: ${issues.join('; ')}`)
  } else {
    console.log(`♿ [${pageName}] No critical accessibility issues found`)
  }
  
  return issues
}

// Test suite for UX Research
test.describe('UX Research - User Scenarios', () => {
  
  test('1. Login Flow - Complete user journey', async ({ page }) => {
    // Start at login page
    await page.goto('/login')
    await measurePerformance(page, 'Login Page')
    
    // Verify login form elements are present
    const emailInput = page.getByRole('textbox', { name: /email|you@example.com/i })
    const passwordInput = page.getByRole('textbox', { name: /пароль|password|•/i })
    const submitButton = page.getByRole('button', { name: /войти|войти/i })
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
    
    // Check form has proper labels
    const emailLabel = await emailInput.getAttribute('id') || await emailInput.getAttribute('aria-label')
    const passwordLabel = await passwordInput.getAttribute('id') || await passwordInput.getAttribute('aria-label')
    
    console.log(`📝 Login form: email input has label: ${!!emailLabel}, password input has label: ${!!passwordLabel}`)
    
    // Test invalid login
    await emailInput.fill('invalid@example.com')
    await passwordInput.fill('wrongpass')
    await submitButton.click()
    
    // Should stay on login page or show error
    await expect(page).toHaveURL(/\/login/)
    
    // Test valid login
    await emailInput.fill(ADMIN_EMAIL)
    await passwordInput.fill(ADMIN_PASS)
    await submitButton.click()
    
    // Wait for redirect
    await page.waitForURL(/\/(therapist|admin)/, { timeout: 30000 })
    
    console.log('✅ Login flow completed successfully')
  })
  
  test('2. Navigation and Menu Usability', async ({ page }) => {
    await loginAsAdmin(page)
    await measurePerformance(page, 'Dashboard/Therapist Page')
    
    // Check for main navigation elements
    const navElements = await page.locator('nav, [role="navigation"]').count()
    console.log(`🧭 Found ${navElements} navigation elements`)
    
    // Check for hamburger menu on mobile (we'll test responsive later)
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰")')
    
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count()
    const h2Count = await page.locator('h2').count()
    
    console.log(`📑 Heading structure: ${h1Count} H1, ${h2Count} H2`)
    
    // Verify each page has exactly one H1 (best practice)
    if (h1Count === 0) {
      console.warn('⚠️ No H1 heading found on page')
    } else if (h1Count > 1) {
      console.warn(`⚠️ Multiple H1 headings found (${h1Count}) - should have only one`)
    }
    
    console.log('✅ Navigation structure analyzed')
  })
  
  test('3. Form Usability and Validation', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate to admin exercise types
    await page.goto('/admin/exercise-types')
    await measurePerformance(page, 'Admin Exercise Types')
    
    // Check form validation messages
    const forms = page.locator('form')
    const formCount = await forms.count()
    console.log(`📝 Found ${formCount} forms on page`)
    
    // Check if forms have proper validation
    for (let i = 0; i < Math.min(formCount, 3); i++) {
      const form = forms.nth(i)
      const inputs = await form.locator('input, select, textarea').count()
      const requiredInputs = await form.locator('input[required], select[required], textarea[required]').count()
      console.log(`   Form ${i + 1}: ${inputs} inputs, ${requiredInputs} required`)
    }
    
    // Check for error message containers
    const errorMessages = await page.locator('[role="alert"], .error, .text-red-500').count()
    console.log(`⚠️ Found ${errorMessages} potential error message elements`)
    
    console.log('✅ Form usability analyzed')
  })
  
  test('4. Loading States and User Feedback', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Navigate and observe loading states
    await page.goto('/admin/exercise-types')
    
    // Check for loading indicators
    const loadingSpinner = page.locator('.spinner, .loading, [aria-busy="true"], svg[class*="animate"]')
    const loadingText = page.locator('text=Загрузка, text=Loading, text=Загружаем')
    
    // Check for toast notifications
    const toastContainer = page.locator('[role="status"], [role="alert"], .toast')
    
    console.log(`⏳ Loading indicators found: ${await loadingSpinner.count()}`)
    console.log(`🍞 Toast/notification containers found: ${await toastContainer.count()}`)
    
    // Check for skeleton loaders (modern loading state)
    const skeletons = await page.locator('.skeleton, [class*="skeleton"]').count()
    console.log(`💀 Skeleton loaders found: ${skeletons}`)
    
    console.log('✅ Loading states analyzed')
  })
  
  test('5. Error Handling and Recovery', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page-12345')
    
    const has404Content = await page.locator('text=404, text=Not Found, text=Страница не найдена').count()
    const hasBackButton = await page.locator('button:has-text("назад"), button:has-text("back"), a[href="/"]').count()
    
    console.log(`❌ 404 page has proper message: ${has404Content > 0}, has back navigation: ${hasBackButton > 0}`)
    
    // Test network error handling
    await page.route('**/api/**', (route) => {
      // Simulate some API failures for testing
      if (Math.random() > 0.7) {
        route.abort('failed')
      } else {
        route.continue()
      }
    })
    
    console.log('✅ Error handling analyzed')
  })
  
  test('6. Content Readability Analysis', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/therapist')
    
    // Check font sizes
    const fontSizes = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, span, a, li')
      const sizes = new Set<string>()
      elements.forEach(el => {
        const style = window.getComputedStyle(el)
        sizes.add(style.fontSize)
      })
      return Array.from(sizes).slice(0, 10)
    })
    
    // Check line heights
    const lineHeights = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, li')
      const heights = new Set<string>()
      elements.forEach(el => {
        const style = window.getComputedStyle(el)
        heights.add(style.lineHeight)
      })
      return Array.from(heights).slice(0, 5)
    })
    
    console.log(`🔤 Font sizes used: ${fontSizes.join(', ')}`)
    console.log(`📏 Line heights used: ${lineHeights.join(', ')}`)
    
    // Check text color contrast (basic)
    const textColors = await page.evaluate(() => {
      const elements = document.querySelectorAll('p, span, a, li, h1, h2, h3, h4, h5, h6')
      const colors = new Set<string>()
      elements.forEach(el => {
        const style = window.getComputedStyle(el)
        if (style.color && style.color !== 'rgba(0, 0, 0, 0)') {
          colors.add(style.color)
        }
      })
      return Array.from(colors)
    })
    
    console.log(`🎨 Text colors used: ${textColors.slice(0, 5).join(', ')}`)
    
    console.log('✅ Content readability analyzed')
  })
  
  test('7. Interactive Elements Feedback', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/exercise-types')
    
    // Check if buttons have hover states (CSS)
    const buttonsWithHover = await page.locator('button:hover, a:hover').count()
    console.log(`👆 Elements with hover states: ${buttonsWithHover}`)
    
    // Check for focus indicators
    const focusableElements = await page.locator('button, a, input, select, textarea, [tabindex]').count()
    console.log(`🎯 Focusable elements: ${focusableElements}`)
    
    // Check for active/pressed states
    const activeElements = await page.locator('.active, [aria-pressed="true"]').count()
    console.log(`🔘 Active/pressed elements: ${activeElements}`)
    
    // Test button click feedback
    const firstButton = page.locator('button').first()
    if (await firstButton.count() > 0) {
      await firstButton.click()
      // Check if there's any visual feedback (toast, alert, etc.)
      const feedback = await page.locator('[role="alert"], .toast, text=Сохранено').count()
      console.log(`📢 Button click feedback: ${feedback > 0 ? 'Yes' : 'No'}`)
    }
    
    console.log('✅ Interactive elements analyzed')
  })
})

// Test suite for Responsive Design
test.describe('UX Research - Responsive Design', () => {
  
  test('8. Mobile Layout (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/login')
    await measurePerformance(page, 'Login Page (Mobile)')
    
    // Check if content is readable
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    
    console.log(`📱 Mobile: viewport ${viewportWidth}px, content ${bodyWidth}px`)
    
    // Check for horizontal scroll
    const hasHorizontalScroll = bodyWidth > viewportWidth
    console.log(`⚠️ Horizontal scroll detected: ${hasHorizontalScroll}`)
    
    // Check for menu functionality
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰"), [class*="hamburger"]')
    const hasMobileMenu = await menuButton.count() > 0
    console.log(`🍔 Mobile menu present: ${hasMobileMenu}`)
    
    // Check touch targets are at least 44x44px
    const smallTouchTargets = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a')
      let count = 0
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect()
        if (rect.width < 44 || rect.height < 44) {
          count++
        }
      })
      return count
    })
    
    if (smallTouchTargets > 0) {
      console.warn(`⚠️ Found ${smallTouchTargets} touch targets smaller than 44x44px`)
    }
    
    await checkAccessibility(page, 'Mobile Login')
  })
  
  test('9. Tablet Layout (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login')
    await measurePerformance(page, 'Login Page (Tablet)')
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    
    console.log(`📱 Tablet: viewport ${viewportWidth}px, content ${bodyWidth}px`)
    
    await checkAccessibility(page, 'Tablet Login')
  })
  
  test('10. Desktop Layout (1920px)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await loginAsAdmin(page)
    await measurePerformance(page, 'Dashboard (Desktop)')
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    
    console.log(`💻 Desktop: viewport ${viewportWidth}px, content ${bodyWidth}px`)
    
    await checkAccessibility(page, 'Desktop Dashboard')
  })
  
  test('11. Responsive Design - Element Adaptation', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 812 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Laptop', width: 1366, height: 768 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ]
    
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto('/login', { waitUntil: 'networkidle' })
      
      // Check layout shifts
      const layout = await page.evaluate(() => {
        const body = document.body
        return {
          scrollWidth: body.scrollWidth,
          clientWidth: body.clientWidth,
          offsetWidth: body.offsetWidth
        }
      })
      
      console.log(`📐 [${vp.name}] Layout: scroll=${layout.scrollWidth}, client=${layout.clientWidth}, offset=${layout.offsetWidth}`)
    }
    
    console.log('✅ Responsive element adaptation analyzed')
  })
})

// Test suite for Performance
test.describe('UX Research - Performance', () => {
  
  test('12. Page Load Performance', async ({ page }) => {
    const pages = [
      { url: '/login', name: 'Login' },
      { url: '/therapist', name: 'Dashboard', requiresAuth: true }
    ]
    
    for (const p of pages) {
      if (p.requiresAuth) {
        await loginAsAdmin(page)
      }
      
      await page.goto(p.url, { waitUntil: 'domcontentloaded' })
      const metrics = await measurePerformance(page, p.name)
      
      // Performance thresholds
      const thresholds = {
        loadTime: 3000, // 3 seconds
        ttfb: 1000, // 1 second
        fcp: 2000, // 2 seconds
        lcp: 4000, // 4 seconds
        cls: 0.1 // 0.1 layout shift
      }
      
      if (metrics.loadTime > thresholds.loadTime) {
        console.warn(`⚠️ Load time (${metrics.loadTime}ms) exceeds threshold (${thresholds.loadTime}ms)`)
      }
      if (metrics.firstContentfulPaint > thresholds.fcp) {
        console.warn(`⚠️ FCP (${metrics.firstContentfulPaint}ms) exceeds threshold (${thresholds.fcp}ms)`)
      }
      if (metrics.largestContentfulPaint > thresholds.lcp) {
        console.warn(`⚠️ LCP (${metrics.largestContentfulPaint}ms) exceeds threshold (${thresholds.lcp}ms)`)
      }
      if (metrics.cumulativeLayoutShift > thresholds.cls) {
        console.warn(`⚠️ CLS (${metrics.cumulativeLayoutShift}) exceeds threshold (${thresholds.cls})`)
      }
    }
    
    console.log('✅ Page load performance analyzed')
  })
  
  test('13. API Response Time', async ({ page }) => {
    await loginAsAdmin(page)
    
    const apiEndpoints = [
      '/api/auth/me',
      '/api/exercises',
      '/api/children'
    ]
    
    for (const endpoint of apiEndpoints) {
      const startTime = Date.now()
      const response = await page.request.get(endpoint)
      const endTime = Date.now()
      
      const responseTime = endTime - startTime
      console.log(`⏱️ [${endpoint}] ${response.status()} - ${responseTime}ms`)
      
      if (responseTime > 2000) {
        console.warn(`⚠️ API response time exceeds 2 seconds`)
      }
    }
    
    console.log('✅ API response times analyzed')
  })
  
  test('14. Resource Loading Analysis', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const result: Record<string, { count: number, totalSize: number }> = {}
      
      entries.forEach(entry => {
        const type = entry.initiatorType
        if (!result[type]) {
          result[type] = { count: 0, totalSize: 0 }
        }
        result[type].count++
        result[type].totalSize += entry.transferSize || 0
      })
      
      return result
    })
    
    console.log('📦 Resource loading:')
    Object.entries(resources).forEach(([type, data]) => {
      console.log(`   ${type}: ${data.count} files, ${(data.totalSize / 1024).toFixed(1)} KB`)
    })
    
    // Check for large files
    const largeResources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      return entries.filter(e => (e.transferSize || 0) > 500000).map(e => ({
        name: e.name.split('/').pop(),
        size: (e.transferSize || 0) / 1024
      }))
    })
    
    if (largeResources.length > 0) {
      console.warn(`⚠️ Large resources found:`)
      largeResources.forEach(r => console.warn(`   ${r.name}: ${r.size.toFixed(1)} KB`))
    }
    
    console.log('✅ Resource loading analyzed')
  })
})

// Test suite for Accessibility
test.describe('UX Research - Accessibility', () => {
  
  test('15. Comprehensive Accessibility Audit', async ({ page }) => {
    const pages = [
      { url: '/login', name: 'Login' },
      { url: '/therapist', name: 'Dashboard', requiresAuth: true }
    ]
    
    for (const p of pages) {
      if (p.requiresAuth) {
        await loginAsAdmin(page)
      }
      
      await page.goto(p.url)
      await checkAccessibility(page, p.name)
    }
    
    console.log('✅ Accessibility audit completed')
  })
  
  test('16. Keyboard Navigation', async ({ page }) => {
    await page.goto('/login')
    
    // Test Tab navigation
    const tabOrder: string[] = []
    await page.keyboard.press('Tab')
    
    let iterations = 0
    while (iterations < 20) {
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}` : 'none'
      })
      tabOrder.push(focusedElement)
      await page.keyboard.press('Tab')
      iterations++
    }
    
    console.log(`⌨️ Tab order: ${tabOrder.slice(0, 10).join(' → ')}`)
    
    // Check if we can reach all important elements
    const canReachSubmit = tabOrder.some(el => el.includes('button'))
    console.log(`⚠️ Can reach submit button via keyboard: ${canReachSubmit}`)
    
    console.log('✅ Keyboard navigation analyzed')
  })
  
  test('17. Screen Reader Compatibility', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/exercise-types')
    
    // Check for ARIA landmarks
    const landmarks = await page.evaluate(() => {
      const result: Record<string, number> = {}
      const roles = ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search', 'form', 'region']
      roles.forEach(role => {
        const elements = document.querySelectorAll(`[role="${role}"]`)
        if (elements.length > 0) {
          result[role] = elements.length
        }
      })
      return result
    })
    
    console.log('🎭 ARIA landmarks:')
    Object.entries(landmarks).forEach(([role, count]) => {
      console.log(`   ${role}: ${count}`)
    })
    
    // Check for main landmark
    if (!landmarks.main && !landmarks.navigation) {
      console.warn('⚠️ No main landmark found - screen reader users may have difficulty')
    }
    
    console.log('✅ Screen reader compatibility analyzed')
  })
})

// Print final performance summary
test.afterAll(async () => {
  console.log('\n📊 === PERFORMANCE SUMMARY ===')
  console.log('Page,Load Time (ms),TTFB (ms),FCP (ms),LCP (ms),CLS')
  performanceResults.forEach(m => {
    console.log(`${m.pageName},${m.loadTime.toFixed(0)},${m.ttfb.toFixed(0)},${m.firstContentfulPaint.toFixed(0)},${m.largestContentfulPaint.toFixed(0)},${m.cumulativeLayoutShift.toFixed(3)}`)
  })
})
