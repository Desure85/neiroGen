# NeiroGen UI/UX Audit Report

**Date:** March 2026  
**Scope:** Frontend components, styles, and user experience  
**Application:** NeiroGen - Speech Therapy Application (Laravel + Next.js)

---

## Executive Summary

The neiroGen application demonstrates a solid foundation with modern technologies (Next.js 14, Tailwind CSS, Radix UI, shadcn/ui), but suffers from **significant UI inconsistency** across components. This audit identifies 6 major categories of issues with prioritized recommendations.

### Key Findings Summary

| Category | Severity | Impact |
|----------|----------|--------|
| Button Style Inconsistency | 🔴 Critical | Visual inconsistency across app |
| Color Palette Fragmentation | 🔴 Critical | Brand identity confusion |
| Typography Inconsistency | 🟠 High | Visual hierarchy issues |
| Spacing/Layout Inconsistency | 🟠 High | Unprofessional appearance |
| Accessibility Gaps | 🟡 Medium | Excludes users with disabilities |
| Responsive Design | 🟡 Medium | Poor experience on devices |

---

## 1. Button Style Inconsistency (CRITICAL)

### Current State

The codebase uses **at least 5 different approaches** for button styling:

#### 1.1 Custom Utility Classes (globals.css)
```css
.medical-button-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg;
}

.medical-button-secondary {
  @apply bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg;
}

.child-button {
  @apply bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 
         text-white font-bold py-3 px-6 rounded-full text-lg shadow-lg transform hover:scale-105;
}
```

**Usage found in:** 0 components (defined but unused)

#### 1.2 Direct Tailwind Classes (25+ occurrences)
```tsx
// exercise-generator.tsx, exercise-player.tsx, etc.
className="bg-blue-500 text-white"
className="bg-gray-100 text-gray-700"
className="bg-green-600 hover:bg-green-700"
className="bg-green-100 text-green-800"
```

**Files affected:**
- `exercise-generator.tsx` (lines 224, 255, 263, 290)
- `exercise-player.tsx` (lines 142, 146, 177, 263)
- `exercise-generator-new.tsx` (lines 240, 290)
- `exercise-results.tsx` (lines 87-103)
- `worksheet-generator.tsx` (line 2445)
- And 15+ more files

#### 1.3 Shadcn UI Button Component
```tsx
<Button variant="default">Text</Button>
<Button variant="outline">Text</Button>
<Button variant="ghost">Text</Button>
<Button variant="destructive">Text</Button>
```

**Properly used in:** Most new components

#### 1.4 Mixed Inline Styles
```tsx
<button className="px-3 py-1 rounded-full text-sm border bg-blue-600 text-white" />
<button className="rounded-md px-4 py-2 bg-primary hover:bg-primary/90" />
```

### Recommendations

1. **Phase 1 - Immediate** (1 week):
   - Remove unused custom classes from `globals.css`
   - Create Button variants in `components/ui/button.tsx` for common patterns:
     - `medical`: Blue primary buttons
     - `success`: Green buttons for positive actions
     - `child`: Gradient buttons for child-facing UI

2. **Phase 2 - Migration** (2-3 weeks):
   - Audit all 25+ files with inline Tailwind buttons
   - Replace with Shadcn Button component
   - Create ESLint rule to prevent inline button styles

---

## 2. Color Palette Fragmentation (CRITICAL)

### Current State

Three color systems exist but aren't unified:

#### 2.1 CSS Variables (defined in globals.css, NOT USED)
```css
:root {
  /* Shadcn UI tokens */
  --primary: 217 91% 60%;
  --secondary: 210 40% 96%;
  --muted: 210 40% 96%;
  --destructive: 0 84.2% 60.2%;
  
  /* Medical app tokens (unused) */
  --medical-primary: 217 91% 60%;
  --medical-secondary: 142 76% 36%;
  --medical-success: 142 76% 36%;
  --medical-warning: 45 93% 58%;
  --medical-danger: 0 84% 60%;
  
  /* Child-friendly tokens (unused) */
  --child-primary: 217 91% 60%;
  --child-success: 142 76% 36%;
}
```

#### 2.2 Direct Tailwind Classes (MAJOR ISSUE)
```tsx
// Difficulty badges - inconsistent patterns
'bg-green-100 text-green-800'  // easy
'bg-yellow-100 text-yellow-800' // medium
'bg-red-100 text-red-800'       // hard

// Status colors
'bg-blue-50 text-blue-700'
'bg-green-50 text-green-700'
'bg-purple-50 text-purple-700'
'bg-orange-50 text-orange-700'

// Action buttons
'bg-blue-500'
'bg-blue-600'
'bg-green-600'
```

#### 2.3 Hardcoded Hex Colors (Canvas Components - Justified)
```tsx
// worksheet-layout-canvas.tsx - These are appropriate for canvas drawing
stroke: '#000000'
fill: '#ffffff'
strokeWidth: 2
```

### Recommendations

1. **Create semantic color tokens:**
```tsx
// tailwind.config.ts
colors: {
  difficulty: {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    hard: 'bg-red-100 text-red-800',
  },
  status: {
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700',
  }
}
```

2. **Migrate inline colors to semantic classes**

3. **Document color usage in Storybook or style guide**

---

## 3. Typography Inconsistency (HIGH)

### Current Issues

#### 3.1 Font Weight Mixing
```tsx
// Various weights used interchangeably
className="font-medium"
className="font-semibold" 
className="font-bold"

// Without clear hierarchy
<h1 className="text-2xl font-bold">   // Page titles
<h2 className="text-xl font-semibold"> // Section headers
<h3 className="text-lg font-medium">  // Subsections
```

#### 3.2 Inconsistent Heading Sizes
```tsx
// exercise-results.tsx
<h2 className="text-2xl font-bold">

// dashboard-header.tsx  
<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">

// content-block-manager.tsx
<h2 className="text-2xl font-bold">
```

#### 3.3 Text Color Inconsistencies
```tsx
// Various text colors without semantic meaning
className="text-gray-600"
className="text-muted-foreground"
className="text-foreground"
className="text-blue-600"
```

### Recommendations

1. **Establish typography scale:**
```tsx
// tailwind.config.ts
theme: {
  fontSize: {
    'heading-1': ['2rem', { lineHeight: '1.2', fontWeight: '700' }],
    'heading-2': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
    'heading-3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
    'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
    'caption': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
  }
}
```

2. **Replace all text-* utilities with semantic classes**

---

## 4. Spacing & Layout Inconsistency (HIGH)

### Current Issues

#### 4.1 Padding/Margin Values
```tsx
// Multiple different padding values
className="p-2"
className="p-3"
className="p-4"
className="p-6"
className="px-2 py-1"
className="px-3 py-2"
className="px-4 py-2"

// Without clear spacing scale
```

#### 4.2 Border Radius Inconsistency
```tsx
// Multiple radius values
className="rounded"
className="rounded-md"
className="rounded-lg"
className="rounded-full"
className="rounded-xl"
```

#### 4.3 Grid Layout Variations
```tsx
// Inconsistent grid patterns
className="grid grid-cols-2"
className="grid grid-cols-3"
className="grid grid-cols-4"
className="grid lg:grid-cols-2"
className="grid md:grid-cols-2 lg:grid-cols-4"
```

### Recommendations

1. **Define spacing tokens in tailwind.config.ts:**
```tsx
theme: {
  extend: {
    spacing: {
      'card': '1rem',      // 4px
      'section': '1.5rem', // 6px
      'page': '2rem',      // 8px
    }
  }
}
```

2. **Standardize component padding:**
   - Buttons: `px-4 py-2`
   - Cards: `p-4` or `p-6`
   - Inputs: `px-3 py-2`

---

## 5. Accessibility Gaps (MEDIUM)

### Current State

#### 5.1 What EXISTS (Good):
- Shadcn UI components include ARIA roles
- Some buttons have `aria-label`
- Keyboard navigation in some dialogs
- Color contrast generally adequate

#### 5.2 What's MISSING:

**a) Form Labels**
```tsx
// Missing labels - ONLY 1 found with proper association
<label htmlFor="exercise-type-name">Название</label>

// Many inputs lack labels
<Input value={...} onChange={...} />
```

**b) Error Messaging**
```tsx
// No aria-describedby for errors
<input className="border-red-500" />
// Should have aria-describedby="error-message"
```

**c) Focus Management**
- No visible focus indicators in some components
- Dialogs don't always trap focus

**d) Screen Reader Support**
- Decorative icons lack `aria-hidden="true"`
- Status updates don't have `aria-live`

### Files with Accessibility Issues

| File | Issues |
|------|--------|
| `exercise-constructor.tsx` | Missing form labels, missing aria-describedby |
| `exercise-generator.tsx` | Missing form labels |
| `worksheet-generator.tsx` | Missing form labels |
| `content-block-manager.tsx` | Missing form labels |

### Recommendations

1. **Add ESLint plugin for accessibility:**
```bash
npm install eslint-plugin-jsx-a11y --save-dev
```

2. **Create accessible form components:**
```tsx
// components/ui/form-field.tsx
<FormField>
  <FormLabel>Label</FormLabel>
  <Input />
  <FormDescription>Help text</FormDescription>
  <FormMessage />
</FormField>
```

3. **Audit all interactive elements for keyboard support**

---

## 6. Responsive Design (MEDIUM)

### Current State

#### 6.1 Good Practices Found:
```tsx
// header.tsx - Proper hiding
<nav className="hidden md:flex items-center gap-3">

// worksheet-generator.tsx - Responsive grid
<div className="grid gap-3 md:grid-cols-2">

// section-card.tsx - Responsive actions
<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
```

#### 6.2 Issues:

**a) Inconsistent Breakpoints**
```tsx
// Some use sm:
className="sm:px-6"

// Others use md:
className="md:grid-cols-2"

// Others use lg:
className="lg:grid-cols-4"
```

**b) Mobile-First Not Always Applied**
```tsx
// Should be mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

// But found:
<div className="hidden md:block">  // Not ideal
```

**c) Touch Targets Too Small**
```tsx
// Some buttons are too small for touch
className="h-8 px-2"  // 32px - borderline
className="h-6 px-1"  // 24px - too small!
```

### Recommendations

1. **Standardize breakpoint usage:**
   - Use `sm` for: buttons, inputs, small components
   - Use `md` for: cards, medium layouts
   - Use `lg` for: grids, major sections

2. **Ensure minimum touch target size (44px)**

3. **Test on actual mobile devices**

---

## 7. Component Architecture Issues

### 7.1 Missing Component Abstraction

**Repeated patterns that should be components:**

```tsx
// Difficulty Badge - repeated 6+ times
<div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
  Легкий
</div>

// Should be:
// <DifficultyBadge level="easy" />
```

### Recommendations

1. **Create domain-specific components:**
   - `<DifficultyBadge />`
   - `<StatusBadge />`
   - `<StatsCard />`
   - `<ExerciseCard />`

---

## Priority Implementation Plan

### Week 1-2: Critical Fixes
1. ✅ Create Button variants in shadcn
2. ✅ Replace inline button styles in top 5 files
3. ✅ Add form labels to all inputs

### Week 3-4: Foundation
4. Create semantic color tokens
5. Define typography scale
6. Create reusable domain components

### Week 5-8: Consistency
7. Audit and fix remaining files
8. Add ESLint rules
9. Document in Storybook

### Ongoing
10. Code review for style consistency
11. Accessibility testing in CI/CD

---

## Appendix: Files Requiring Immediate Attention

| Priority | File | Issues |
|----------|------|--------|
| 🔴 P1 | exercise-generator.tsx | 8+ inline button styles |
| 🔴 P1 | exercise-player.tsx | 6+ inline styles, missing labels |
| 🔴 P1 | exercise-results.tsx | 5+ inline styles |
| 🟠 P2 | worksheet-generator.tsx | Multiple inconsistencies |
| 🟠 P2 | content-block-manager.tsx | Missing labels |
| 🟠 P2 | exercise-constructor.tsx | Missing labels |
| 🟡 P3 | graphic-dictation-editor.tsx | Canvas-specific (low priority) |

---

## Conclusion

The neiroGen application has strong technical foundations but needs significant UI consistency work. The main issues stem from:

1. **Multiple styling approaches** - mixing custom CSS, Tailwind, and component libraries
2. **Design tokens defined but not used** - CSS variables exist but aren't applied
3. **Rapid feature development** - components built without following existing patterns

Following this audit with systematic refactoring will significantly improve user experience and maintainability.
