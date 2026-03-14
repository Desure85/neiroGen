import { test, expect, Page } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@demo.local'
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'password'

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  const form = page.locator('form')
  await form.getByRole('textbox', { name: /email|you@example.com/i }).fill(ADMIN_EMAIL)
  await form.getByRole('textbox', { name: /пароль|password|•/i }).fill(ADMIN_PASS)
  await form.getByRole('button', { name: /войти/i }).click()
  await expect(page).toHaveURL(/\/(therapist|admin)/, { timeout: 30000 })
}

// Test suite for Style Consistency Analysis
test.describe('UX Research - Style Consistency & UI Unification', () => {
  
  test('1. Button Style Consistency', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/exercise-types')
    
    // Get all buttons and analyze their styles
    const buttonStyles = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]')
      const styles: Record<string, { count: number, padding: string, fontSize: string, borderRadius: string, backgroundColor: string }> = {}
      
      buttons.forEach(btn => {
        const style = window.getComputedStyle(btn)
        const key = `${style.padding}-${style.fontSize}-${style.borderRadius}-${style.backgroundColor}`
        
        if (!styles[key]) {
          styles[key] = {
            count: 0,
            padding: style.padding,
            fontSize: style.fontSize,
            borderRadius: style.borderRadius,
            backgroundColor: style.backgroundColor
          }
        }
        styles[key].count++
      })
      
      return styles
    })
    
    console.log('🔘 Button styles found:')
    Object.entries(buttonStyles).forEach(([key, data]) => {
      console.log(`   Style: ${key} - ${data.count} buttons`)
    })
    
    // Check if there are more than 3 different button styles (should be unified)
    const uniqueStyles = Object.keys(buttonStyles).length
    if (uniqueStyles > 3) {
      console.warn(`⚠️ Found ${uniqueStyles} different button styles - should be unified`)
    } else {
      console.log(`✅ Button styles are consistent (${uniqueStyles} unique styles)`)
    }
  })
  
  test('2. Input Field Style Consistency', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/exercise-types')
    
    // Find first row to click into edit mode
    const firstRow = page.locator('tbody tr').first()
    if (await firstRow.count() > 0) {
      await firstRow.locator('a', { hasText: 'Открыть' }).click()
      await page.waitForURL('**/admin/exercise-types/*')
    }
    
    const inputStyles = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, select, textarea')
      const styles: Record<string, { count: number, padding: string, fontSize: string, borderRadius: string, border: string }> = {}
      
      inputs.forEach(input => {
        const style = window.getComputedStyle(input)
        const key = `${style.padding}-${style.fontSize}-${style.borderRadius}-${style.border}`
        
        if (!styles[key]) {
          styles[key] = {
            count: 0,
            padding: style.padding,
            fontSize: style.fontSize,
            borderRadius: style.borderRadius,
            border: style.border
          }
        }
        styles[key].count++
      })
      
      return styles
    })
    
    console.log('📝 Input field styles found:')
    Object.entries(inputStyles).forEach(([key, data]) => {
      console.log(`   Style: ${key} - ${data.count} inputs`)
    })
  })
  
  test('3. Color Palette Consistency', async ({ page }) => {
    await loginAsAdmin(page)
    
    // Check multiple pages for color consistency
    const pages = ['/therapist', '/admin/exercise-types']
    const allColors: string[] = []
    
    for (const url of pages) {
      await page.goto(url)
      const colors = await page.evaluate(() => {
        const elements = document.querySelectorAll('*')
        const colors = new Set<string>()
        elements.forEach(el => {
          const style = window.getComputedStyle(el)
          // Get background, text, border colors
          if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
            colors.add(style.backgroundColor)
          }
          if (style.color && style.color !== 'rgba(0, 0, 0, 0)') {
            colors.add(style.color)
          }
        })
        return Array.from(colors)
      })
      allColors.push(...colors)
    }
    
    // Count unique colors
    const uniqueColors = new Set(allColors)
    console.log(`🎨 Total unique colors found: ${uniqueColors.size}`)
    
    // Common design systems have limited color palette (10-20 colors)
    if (uniqueColors.size > 30) {
      console.warn(`⚠️ Large color palette (${uniqueColors.size} colors) - consider unifying`)
    } else {
      console.log(`✅ Color palette is reasonable (${uniqueColors.size} colors)`)
    }
    
    // Show top colors
    const colorCounts: Record<string, number> = {}
    allColors.forEach(c => {
      colorCounts[c] = (colorCounts[c] || 0) + 1
    })
    
    console.log('   Top colors by usage:')
    Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([color, count]) => {
        console.log(`   ${color}: ${count} times`)
      })
  })
  
  test('4. Typography Consistency', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/therapist')
    
    const typography = await page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      const fonts: Record<string, number> = {}
      const fontSizes: Record<string, number> = {}
      const fontWeights: Record<string, number> = {}
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el)
        if (style.fontFamily) {
          fonts[style.fontFamily] = (fonts[style.fontFamily] || 0) + 1
        }
        if (style.fontSize) {
          fontSizes[style.fontSize] = (fontSizes[style.fontSize] || 0) + 1
        }
        if (style.fontWeight) {
          fontWeights[style.fontWeight] = (fontWeights[style.fontWeight] || 0) + 1
        }
      })
      
      return { fonts, fontSizes, fontWeights }
    })
    
    console.log('🔤 Typography analysis:')
    console.log(`   Font families: ${Object.keys(typography.fonts).length}`)
    console.log(`   Font sizes: ${Object.keys(typography.fontSizes).length}`)
    console.log(`   Font weights: ${Object.keys(typography.fontWeights).length}`)
    
    if (Object.keys(typography.fontSizes).length > 10) {
      console.warn('⚠️ Many different font sizes - consider using a scale')
    }
    
    if (Object.keys(typography.fonts).length > 3) {
      console.warn('⚠️ Multiple font families - should be unified to 1-2')
    }
  })
  
  test('5. Spacing Consistency', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/exercise-types')
    
    const spacing = await page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      const margins: Record<string, number> = {}
      const paddings: Record<string, number> = {}
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el)
        if (style.margin && style.margin !== '0px') {
          margins[style.margin] = (margins[style.margin] || 0) + 1
        }
        if (style.padding && style.padding !== '0px') {
          paddings[style.padding] = (paddings[style.padding] || 0) + 1
        }
      })
      
      return { margins, paddings }
    })
    
    console.log('📏 Spacing analysis:')
    console.log(`   Unique margin values: ${Object.keys(spacing.margins).length}`)
    console.log(`   Unique padding values: ${Object.keys(spacing.paddings).length}`)
    
    // Show most common spacing values
    console.log('   Common padding values:')
    Object.entries(spacing.paddings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([padding, count]) => {
        console.log(`   ${padding}: ${count} times`)
      })
  })
  
  test('6. Card/Panel Component Consistency', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/therapist')
    
    const cardStyles = await page.evaluate(() => {
      // Look for cards, panels, containers
      const selectors = ['.card', '.panel', '.box', '.container', '[class*="card"]', '[class*="panel"]']
      let elements: Element[] = []
      
      selectors.forEach(sel => {
        try {
          elements.push(...document.querySelectorAll(sel))
        } catch (e) {}
      })
      
      // If no explicit card classes, look for bordered elements
      if (elements.length === 0) {
        const allElements = document.querySelectorAll('div')
        allElements.forEach(el => {
          const style = window.getComputedStyle(el)
          if (style.border && style.border !== 'none' && style.border !== '0px') {
            elements.push(el)
          }
        })
      }
      
      const styles: Record<string, number> = {}
      elements.forEach(el => {
        const style = window.getComputedStyle(el)
        const key = `${style.borderRadius}-${style.border}-${style.boxShadow}`
        styles[key] = (styles[key] || 0) + 1
      })
      
      return styles
    })
    
    console.log('🃏 Card/panel styles:')
    Object.entries(cardStyles).forEach(([style, count]) => {
      console.log(`   ${style}: ${count} elements`)
    })
  })
  
  test('7. Table Style Consistency', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/exercise-types')
    
    const tableStyles = await page.evaluate(() => {
      const tables = document.querySelectorAll('table')
      const styles: Array<{ borderCollapse: string, borderSpacing: string, cellPadding: string }> = []
      
      tables.forEach(table => {
        const style = window.getComputedStyle(table)
        styles.push({
          borderCollapse: style.borderCollapse,
          borderSpacing: style.borderSpacing,
          cellPadding: style.padding
        })
      })
      
      return styles
    })
    
    console.log('📊 Table styles:')
    console.log(`   Tables found: ${tableStyles.length}`)
    tableStyles.forEach((style, i) => {
      console.log(`   Table ${i + 1}: border-collapse=${style.borderCollapse}, spacing=${style.borderSpacing}`)
    })
    
    // Check for inconsistent table styles
    const uniqueStyles = new Set(tableStyles.map(s => `${s.borderCollapse}-${s.borderSpacing}`))
    if (uniqueStyles.size > 1) {
      console.warn('⚠️ Inconsistent table styles found')
    }
  })
  
  test('8. Icon Consistency', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/exercise-types')
    
    const icons = await page.evaluate(() => {
      // Look for icons (svg, icon classes, etc.)
      const svgs = document.querySelectorAll('svg')
      const iconClasses = new Set<string>()
      const iconSizes: Record<string, number> = {}
      
      svgs.forEach(svg => {
        const style = window.getComputedStyle(svg)
        iconSizes[style.width] = (iconSizes[style.width] || 0) + 1
        iconSizes[style.height] = (iconSizes[style.height] || 0) + 1
      })
      
      // Check for common icon libraries
      const lucideIcons = document.querySelectorAll('[class*="lucide"]')
      const radixIcons = document.querySelectorAll('[class*="radix"]')
      
      return {
        svgCount: svgs.length,
        lucideCount: lucideIcons.length,
        radixCount: radixIcons.length,
        sizes: iconSizes
      }
    })
    
    console.log('🖼️ Icon analysis:')
    console.log(`   Total SVG icons: ${icons.svgCount}`)
    console.log(`   Lucide icons: ${icons.lucideCount}`)
    console.log(`   Icon sizes: ${Object.keys(icons.sizes).length}`)
    
    if (Object.keys(icons.sizes).length > 3) {
      console.warn('⚠️ Multiple icon sizes - should be unified')
    }
  })
  
  test('9. Responsive Breakpoint Consistency', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375 },
      { name: 'Tablet', width: 768 },
      { name: 'Desktop', width: 1280 },
      { name: 'Large', width: 1920 }
    ]
    
    console.log('📱 Responsive breakpoint analysis:')
    
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: 800 })
      await page.goto('/login', { waitUntil: 'networkidle' })
      
      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth
      })
      
      console.log(`   ${vp.name} (${vp.width}px): horizontal scroll = ${hasHorizontalScroll ? 'YES ⚠️' : 'No ✅'}`)
    }
  })
  
  test('10. Z-Index/Layer Consistency', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/exercise-types')
    
    const zIndexes = await page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      const zValues: Record<string, number> = {}
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el)
        const zIndex = style.zIndex
        if (zIndex && zIndex !== 'auto' && zIndex !== '0') {
          zValues[zIndex] = (zValues[zIndex] || 0) + 1
        }
      })
      
      return zValues
    })
    
    console.log('📚 Z-index usage:')
    Object.entries(zIndexes)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .slice(0, 10)
      .forEach(([z, count]) => {
        console.log(`   z-index ${z}: ${count} elements`)
      })
    
    if (Object.keys(zIndexes).length > 10) {
      console.warn('⚠️ Many different z-index values - should use a scale')
    }
  })
})

// Summary test - collects all style data
test.describe('UX Research - Style Summary', () => {
  test('Generate style consistency report', async ({ page }) => {
    await loginAsAdmin(page)
    
    console.log('\n🎨 === STYLE CONSISTENCY REPORT ===\n')
    
    // Check all main pages
    const pages = [
      { url: '/login', name: 'Login' },
      { url: '/therapist', name: 'Dashboard' },
      { url: '/admin/exercise-types', name: 'Admin' }
    ]
    
    for (const p of pages) {
      await page.goto(p.url)
      await page.waitForLoadState('networkidle')
      
      console.log(`📄 Page: ${p.name}`)
      
      // Quick color check
      const colors = await page.evaluate(() => {
        const elements = document.querySelectorAll('*')
        const uniqueColors = new Set<string>()
        elements.forEach(el => {
          const style = window.getComputedStyle(el)
          if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
            uniqueColors.add(style.backgroundColor)
          }
        })
        return uniqueColors.size
      })
      console.log(`   Colors: ${colors}`)
      
      // Quick button check
      const buttons = await page.locator('button').count()
      console.log(`   Buttons: ${buttons}`)
    }
    
    console.log('\n✅ Style analysis complete')
  })
})
