# TRACER C2 Merchant Account Analytics Dashboard

A professional web application for tracking merchant account retention, revenue trends, and growth metrics across Clearent, ML, and Shift4 payment processors.

## Features

- **CSV Upload**: Drag-and-drop interface for uploading monthly merchant data
- **Automatic Analytics**: Calculates retention rates, attrition, revenue growth, and account metrics
- **Interactive Charts**: Visual insights with revenue trends, account activity, and retention analysis
- **Multi-Processor Support**: Separate analytics for Clearent, ML, and Shift4 plus combined overview
- **Processor Comparison**: Side-by-side metrics and revenue distribution charts
- **Top Merchants**: Sortable table showing highest revenue accounts
- **Dark Mode**: Professional appearance in both light and dark themes
- **Client-Side Storage**: All data stored locally in browser (no backend required)

## Getting Started

### Quick Start

1. Click the green **Run** button to start the application
2. Open the application in your browser
3. Upload your first CSV files using the upload dialog

### File Format

Your files (CSV or Excel) should include these columns (column names are flexible):

**Supported Formats:**
- `.csv` - Comma-separated values
- `.xlsx` - Microsoft Excel spreadsheet

**Example:**
```csv
Merchant Id,Merchant Name,Sales Amount,Branch ID,Month
MID001,Joe's Pizza,15000,BR001,2024-07
MID002,ABC Retail,8500,BR002,2024-07
```

**Required Columns:**
- **Merchant Id** (or: MerchantID, MID, ID) - Unique identifier for each merchant
- **Merchant Name** (or: Name, Business Name) - Name of the business
- **Sales Amount** (or: Revenue, Volume, Net) - Monthly revenue from merchant

**Optional Columns:**
- **Branch ID** (or: Branch, Agent ID) - Internal sales branch code
- **Month** (or: Date, Period) - Date identifier (can be extracted from filename)

### File Naming Convention

For automatic processor detection, name your files like:
- `Clearent_July2024.csv`
- `ML_August2024.csv`
- `Shift4_September2024.csv`

The system will automatically detect:
- Processor from filename (Clearent, ML, or Shift4)
- Month/year from filename or file contents

## How It Works

### Data Processing

1. **Upload**: Select or drag CSV files into the upload zone
2. **Validation**: System checks for required columns and data quality
3. **Processing**: Parses data, handles duplicates (keeps highest revenue), normalizes formats
4. **Storage**: Saves to browser localStorage for persistence
5. **Analytics**: Automatically calculates all metrics and trends

### Retention Calculations

- **Retained Accounts**: Merchant IDs present in both current and previous month
- **Lost Accounts**: Merchant IDs in previous month but not current month
- **New Accounts**: Merchant IDs in current month but not in previous month
- **Retention Rate**: (Retained / Previous Month Total) × 100%
- **Attrition Rate**: (Lost / Previous Month Total) × 100%

## Dashboard Tabs

### Overview
Combined analytics across all three processors showing total revenue, retention, and growth.

### Clearent / ML / Shift4
Individual processor analytics with dedicated charts and top merchants table.

### Compare
Side-by-side comparison of all three processors with revenue and account distribution pie charts.

## Sample Data

Sample files are included in the `public/` folder:
- `sample-clearent.csv` - CSV format sample
- `sample-clearent.xlsx` - Excel format sample (same data)
- `sample-ml.csv` - ML processor data
- `sample-shift4.csv` - Shift4 processor data

Use these to test the dashboard functionality with both CSV and Excel formats.

## Data Management

### Adding New Months

1. Click **Upload New Month** in the top-right corner
2. Select CSV files for the new month
3. Choose processor if not auto-detected
4. Click **Process Files**
5. Dashboard updates automatically

### Common Issues

**"Missing required columns" error**
- Ensure your CSV has Merchant ID, Merchant Name, and Sales Amount columns
- Column names are flexible but must match common variations

**Duplicate Merchant IDs**
- System automatically keeps the entry with highest revenue
- Warnings will show how many duplicates were found

**Invalid data warning**
- Check that Sales Amount values are numbers
- Remove currency symbols ($) from the CSV before upload

**Month not detected**
- Add a Month column to your CSV, or
- Include month/year in the filename (e.g., `Clearent_July2024.csv`)

## Technical Details

### Technology Stack
- **Frontend**: React + TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts
- **CSV Parsing**: PapaParse
- **Storage**: Browser localStorage
- **Date Handling**: date-fns

### Browser Storage
All data is stored client-side using localStorage. Data persists across browser sessions but is specific to each browser. To backup data, you can export to CSV (feature coming soon).

### Performance
- Handles up to 5,000 merchant records per processor
- All calculations happen instantly in the browser
- No server required for basic functionality

## Customization

### Modifying Metrics
Edit `client/src/lib/analytics.ts` to customize:
- Retention rate calculations
- Revenue aggregation methods
- Top merchants limit
- Custom metrics

### Changing Colors
Update `client/src/index.css` to modify:
- Brand colors (currently TRACER C2 navy and green)
- Chart colors
- Theme variables

### Adding Processors
To support additional processors beyond Clearent, ML, and Shift4:
1. Update `Processor` type in `shared/schema.ts`
2. Add detection logic in `client/src/lib/csvParser.ts`
3. Add tab in `client/src/pages/dashboard.tsx`

## Deployment

### Publishing to Replit
1. Test your dashboard thoroughly
2. Click the **Publish** button in Replit
3. Your dashboard will be available at a public URL
4. Share the URL with bank partners and stakeholders

### Custom Domain
You can configure a custom domain through Replit's deployment settings for a more professional appearance.

## Support

For questions or issues:
1. Check this README for common solutions
2. Review sample CSV files for proper format
3. Test with sample data first before using real data

## License

Proprietary - TRACER C2 Internal Use

---

Built with ❤️ for merchant services analytics
