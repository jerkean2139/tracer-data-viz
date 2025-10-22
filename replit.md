# TRACER C2 Merchant Account Analytics Dashboard

## Project Overview

Professional merchant account analytics dashboard for tracking retention, revenue, and growth metrics across three payment processors: Clearent, ML, and Shift4.

**Purpose**: Provide business intelligence for merchant services operations with visual analytics suitable for bank partners and executive presentations.

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **UI Framework**: shadcn/ui components + Tailwind CSS
- **Charts**: Recharts for data visualization
- **CSV Processing**: PapaParse library
- **Storage**: Browser localStorage (client-side persistence)
- **Date Handling**: date-fns
- **Backend**: Minimal Express.js server (serves frontend only)

### Design System
- **Brand Colors**: TRACER C2 navy blue (#1A3A52) and green (#7FA848)
- **Typography**: Inter (sans-serif), JetBrains Mono (monospace for data)
- **Theme**: Supports both light and dark modes
- **Responsive**: Mobile, tablet, and desktop layouts

## Key Features

### Data Processing
1. **File Upload**: Drag-and-drop multi-file upload (supports .csv and .xlsx)
2. **Format Support**: CSV and Excel (XLSX) files - automatically converts Excel to CSV internally
3. **Auto-Detection**: Processor and month detection from filenames
4. **Validation**: Column mapping with flexible field names
5. **Deduplication**: Keeps highest revenue entry for duplicate Merchant IDs
6. **Error Handling**: Comprehensive validation and user-friendly error messages

### Analytics Calculations
- Retention rate (retained accounts / previous month total)
- Attrition rate (lost accounts / previous month total)
- Month-over-month revenue growth
- Revenue per account averages
- Net account growth (new - lost)
- Top 10 merchants by revenue

### Dashboard Views
1. **Overview Tab**: Combined metrics across all processors
2. **Processor Tabs**: Individual analytics for Clearent, ML, Shift4
3. **Compare Tab**: Side-by-side processor comparison with pie charts
4. **Charts**: Revenue trends, account activity (stacked bars), retention rates
5. **Tables**: Sortable top merchants with revenue percentage

## File Structure

```
client/src/
  components/
    csv-upload.tsx           # File upload interface
    metric-card.tsx          # KPI display cards
    revenue-chart.tsx        # Line chart for revenue trends
    account-activity-chart.tsx  # Stacked bar chart
    retention-chart.tsx      # Retention rate line chart
    top-merchants-table.tsx  # Sortable merchant table
    processor-comparison.tsx # Comparison view
    dashboard-content.tsx    # Main dashboard layout
    empty-state.tsx          # First-time user UI
    theme-toggle.tsx         # Dark/light mode switcher
  lib/
    csvParser.ts            # CSV parsing and validation
    analytics.ts            # Metric calculations
    storage.ts              # localStorage wrapper
  pages/
    dashboard.tsx           # Main dashboard page
shared/
  schema.ts                 # TypeScript types and Zod schemas
public/
  sample-*.csv             # Sample CSV files for testing
  sample-clearent.xlsx     # Sample Excel file for testing
```

## Data Model

### MerchantRecord
- merchantId: string (unique identifier)
- merchantName: string
- salesAmount: number (monthly revenue)
- branchId: string (optional, sales branch)
- month: string (YYYY-MM format)
- processor: 'Clearent' | 'ML' | 'Shift4'

### MonthlyMetrics
Calculated for each month/processor combination:
- totalRevenue, totalAccounts
- retainedAccounts, lostAccounts, newAccounts
- retentionRate, attritionRate
- revenuePerAccount
- momRevenueChange, momRevenueChangePercent
- netAccountGrowth

## User Preferences

### CSV Upload Preferences
- Supports flexible column names (case-insensitive, handles extra spaces)
- Auto-detects processor from filename keywords
- Handles common date formats (MM/YYYY, YYYY-MM, Month YYYY)
- Keeps highest revenue entry when duplicates found

### UI Preferences
- Theme: Auto-detects system preference, persists user selection
- Professional financial dashboard aesthetic
- TRACER C2 branding throughout
- Desktop-first design, responsive for tablets/mobile

## Recent Changes (Oct 22, 2025)

### Initial Implementation
- ✅ Complete schema and data model
- ✅ CSV parsing with validation and error handling
- ✅ Analytics engine for all metrics
- ✅ Full component library (upload, charts, tables, cards)
- ✅ Multi-tab dashboard with Overview, 3 processors, and Compare
- ✅ Dark mode support
- ✅ Empty state for first-time users
- ✅ Sample CSV data for testing (3 processors, 3 months each)
- ✅ TRACER C2 brand colors integrated

### Features Implemented
- Drag-and-drop CSV upload with preview
- Automatic retention/attrition/growth calculations
- Interactive Recharts visualizations
- Sortable top merchants table
- Processor comparison with pie charts
- localStorage persistence with deduplication
- Responsive design
- Professional error handling and validation

### Critical Fixes Applied
1. **Upload Success Handling**: Fixed closure issue in `processUploads` by tracking success count during loop execution instead of from stale state snapshot
2. **Duplicate Record Prevention**: Implemented deduplication in `storageService.addRecords` that keys by processor-month-merchantId and keeps highest revenue entry
3. **Type Safety**: Corrected all TypeScript types to use specific processor literals ('Clearent' | 'ML' | 'Shift4') instead of broader Processor type that includes 'All'

## Development Notes

### Running the Project
```bash
npm run dev
```
Access at http://localhost:5000

### Testing with Sample Data
Sample files are in `public/`:
- Test CSV upload with `sample-clearent.csv`, `sample-ml.csv`, `sample-shift4.csv`
- Test Excel upload with `sample-clearent.xlsx` (same data as CSV, different format)
- Files contain 3 months of data (Jan-Mar 2024) to show retention calculations
- Mix processors to test comparison view

### Data Storage
- All data stored in browser localStorage
- Keys: 'merchant_records', 'uploaded_files'
- No backend database required
- Data persists across sessions in same browser

### Customization Points
1. **Colors**: Edit `client/src/index.css` CSS variables
2. **Metrics**: Modify `client/src/lib/analytics.ts`
3. **Validation**: Adjust `client/src/lib/csvParser.ts` column mappings
4. **Charts**: Configure Recharts in component files

## Known Limitations

- Data limited to browser localStorage capacity (~10MB)
- No server-side persistence (can add PostgreSQL later)
- No PDF export yet (planned for future)
- No branch performance analytics yet (planned for future)
- No data editing UI (must delete and re-upload)

## Future Enhancements

Phase 2 (Not Yet Implemented):
- PDF export for executive reports
- CSV data export
- Branch performance analytics
- Data editing capabilities
- Account risk indicators (declining revenue trends)
- Multi-month comparison views
- Custom date range filtering (currently shows all data)

## Production Readiness

Current Status: ✅ MVP Complete
- Core analytics: ✅ Working
- CSV upload: ✅ Working
- Multi-processor support: ✅ Working
- Charts and visualizations: ✅ Working
- Error handling: ✅ Implemented
- Responsive design: ✅ Implemented
- Dark mode: ✅ Working

Ready for:
- ✅ Demo to stakeholders
- ✅ Testing with real merchant data
- ✅ Bank partner presentations

Not Yet Ready for:
- ❌ Multi-user environments (localStorage is per-browser)
- ❌ Data backup/restore (no export feature yet)
- ❌ Production deployment with database persistence

## Deployment

To publish this dashboard:
1. Test thoroughly with sample data
2. Verify all charts render correctly
3. Test CSV upload with various file formats
4. Check dark mode appearance
5. Use Replit's Publish button
6. Dashboard will be available at public .replit.app URL

For enterprise deployment:
- Add PostgreSQL database for persistence
- Implement user authentication
- Add data backup/export features
- Consider custom domain for professional appearance
