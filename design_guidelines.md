# Design Guidelines: Merchant Account Analytics Dashboard

## Design Approach: Professional Financial Analytics

**Selected Approach:** Design System-inspired (Carbon Design + Stripe Dashboard aesthetics)

**Justification:** This is a data-intensive business intelligence tool that must convey professionalism and credibility to bank executives while enabling rapid comprehension of complex financial metrics. The design prioritizes clarity, hierarchy, and trust over visual experimentation.

**Key Design Principles:**
- Data First: Every design decision enhances metric readability
- Executive Ready: Professional polish suitable for stakeholder presentations
- Clarity Over Decoration: Minimal ornamental elements
- Trustworthy Precision: Convey accuracy and reliability through design

---

## Core Design Elements

### A. Color Palette

**Brand Colors:** Extracted from TRACER C2 logo - Navy Blue (#1A3A52) and Green (#7FA848)

**Light Mode:**
- Primary: 201 50% 22% (navy blue from TRACER branding)
- Accent: 86 35% 52% (green from C2 logo - for success states, positive metrics)
- Foreground: 201 50% 22% (navy blue for primary text)
- Background: 0 0% 98% (off-white for main background)
- Card: 0 0% 100% (white for cards, panels)
- Border: 214 15% 91% (light gray for dividers)
- Success: 86 35% 45% (green for retained accounts, positive trends)
- Danger: 0 84% 60% (red for losses, attrition)
- Chart Colors: 201 50% 32% (navy), 86 35% 45% (green), 271 81% 56% (purple), 38 92% 50% (amber), 0 84% 60% (red)

**Dark Mode:**
- Primary: 201 50% 40% (lighter navy blue for dark mode)
- Accent: 86 35% 52% (green maintains vibrancy in dark mode)
- Foreground: 0 0% 98% (near-white for text)
- Background: 201 50% 11% (deep navy for main background)
- Card: 201 45% 16% (dark navy for cards)
- Border: 201 40% 27% (medium navy for dividers)
- Chart colors adjusted for dark mode contrast while maintaining brand identity

### B. Typography

**Font Stack:**
- Primary: 'Inter' (Google Fonts) - exceptional at small sizes, perfect for data tables
- Monospace: 'JetBrains Mono' (Google Fonts) - for merchant IDs, numerical data

**Type Scale:**
- Display (Dashboard Title): 2.25rem (36px), font-weight: 700
- H1 (Section Headers): 1.5rem (24px), font-weight: 600
- H2 (Card Titles): 1.125rem (18px), font-weight: 600
- Body (Default): 0.875rem (14px), font-weight: 400
- Small (Labels, Captions): 0.75rem (12px), font-weight: 500
- Metric Numbers: 2rem-3rem, font-weight: 700, tabular-nums

### C. Layout System

**Tailwind Spacing Primitives:** 2, 4, 6, 8, 12, 16, 24
- Card padding: p-6
- Section spacing: gap-8 or space-y-8
- Metric cards: p-8
- Table cell padding: px-4 py-3
- Chart containers: p-6

**Grid Structure:**
- Dashboard max-width: max-w-7xl mx-auto
- Metric cards: grid-cols-2 md:grid-cols-4 gap-6
- Processor tabs: Full-width contained layout
- Charts: 2-column on desktop (grid-cols-1 lg:grid-cols-2)

### D. Component Library

**Navigation:**
- Top app bar: Fixed, 64px height, with logo, upload button, date range selector
- Tab navigation: Horizontal tabs (Overview, Clearent, ML, Shift4, Compare)
- Underline indicator for active tab

**Metric Cards:**
- White/dark surface with subtle shadow
- Large metric number at top (3rem)
- Label below in muted text
- Small trend indicator (↑↓) with color-coded percentage
- Optional sparkline chart at bottom

**Data Tables:**
- Sticky header row
- Zebra striping (subtle alternating row colors)
- Hover state on rows
- Sortable column headers with sort icons
- Fixed-width columns for IDs, fluid for names
- Right-align numerical columns

**Charts (Recharts):**
- Clean grid lines (dashed, low opacity)
- Tooltips with white/dark background, rounded corners
- Legend positioned top-right or bottom-center
- Consistent color mapping across all charts
- Generous padding around chart area

**Upload Interface:**
- Large dashed border dropzone (min-height: 300px)
- Upload icon centered
- Drag-active state with color change
- File preview cards after upload showing filename, processor, row count
- Validation badges (✓ Valid or ⚠ Issues)

**Buttons:**
- Primary: Solid fill with primary color
- Secondary: Outline variant
- Sizes: Default (h-10 px-4), Large (h-12 px-6)
- Icons: 16px or 20px, positioned left or right

**Alerts/Warnings:**
- Border-left accent (4px wide) in warning/danger color
- Light background tint matching border color
- Icon at start, message text, optional action button

### E. Animations

**Minimal, purposeful only:**
- Metric number count-up on load (0.6s duration)
- Chart entrance: Fade + slide up (0.4s)
- Tab transitions: Fade content swap (0.2s)
- Hover states: Subtle scale (1.02) on cards
- Loading spinner for CSV processing

---

## Page Structure

### Dashboard Layout

**Top Bar (Fixed):**
- Logo/App name left
- Date range selector center
- "Upload New Month" button right (primary color)

**Metric Cards Row:**
- 4 cards in grid: Total Revenue | MoM Growth | Active Accounts | Retention Rate
- Each card: Large number, small label, trend indicator, optional sparkline

**Tabs:**
- Horizontal tab bar below metrics
- Active tab: Underline + bold text

**Content Area (Per Tab):**
- 2-column chart grid (Revenue Trend + Account Activity)
- Full-width chart (Retention Rate Line)
- Top 10 Accounts Table
- All sections have clear headers (H2)

**Compare View:**
- 3-column layout comparing processors
- Metric cards for each processor
- Pie chart showing revenue distribution

---

## Images

**No hero images required.** This is a utility application where data visualization is paramount. All visual interest comes from:
- Chart visualizations (colorful, data-driven)
- Metric cards (bold typography)
- Clean iconography (upload, trend arrows, processor logos if available)

**Icon Usage:**
- Upload cloud icon in dropzone
- Trend arrows (↑↓) in metric cards  
- Processor logos (if provided) in tabs - otherwise use initial letters in colored circles
- Warning/success icons in alerts
- Sort icons in table headers

---

## Responsive Behavior

**Desktop (1280px+):** Full layout as described
**Tablet (768-1279px):** 
- Metric cards: 2 columns
- Charts: Single column
- Tables: Horizontal scroll if needed

**Mobile (<768px):**
- Metric cards: Single column
- Tabs: Horizontal scroll or dropdown
- Charts: Full-width, reduced height
- Tables: Card view (stack rows as cards)

---

## Key UX Patterns

**Empty State:** 
- Large upload icon
- Clear headline: "Upload Your First Month"
- Supporting text explaining CSV format
- Sample CSV download link

**Loading State:**
- Animated spinner with "Processing CSV..." text
- Progress indicator if processing multiple files

**Error State:**
- Red border on upload zone
- List of specific validation errors
- Helpful suggestions for fixing issues

**Success State:**
- Green checkmark animation
- "Data uploaded successfully" message
- Auto-redirect to dashboard after 2s

This design creates a professional, trustworthy analytics platform that prioritizes data clarity while maintaining visual polish suitable for executive presentations.