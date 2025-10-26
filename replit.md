# TRACER C2 Merchant Account Analytics Dashboard

## Overview

The TRACER C2 Merchant Account Analytics Dashboard is a professional business intelligence tool designed to track retention, revenue, and growth metrics across seven payment processors: Clearent, ML, Shift4, TSYS (Global Payments), Micamp, PayBright, and TRX. Its primary purpose is to provide visual analytics suitable for bank partners and executive presentations, offering insights into merchant services operations. The project aims to deliver a comprehensive, user-friendly platform for analyzing merchant performance.

## User Preferences

- **Communication Style**: I prefer clear, concise explanations for complex metrics.
- **Coding Style**: The system should prioritize maintainability and readability, with a focus on modern React and TypeScript practices.
- **Workflow Preferences**:
    - Supports flexible column names (case-insensitive, handles extra spaces).
    - Auto-detects processor from filename keywords (clearent, ml, shift4, global, tsys, micamp, paybright, trx).
    - Handles common date formats (MM/YYYY, YYYY-MM, Month YYYY, MMM-YY like "Jun-25").
    - Automatically skips title rows in CSV files.
    - Processes all sheets in XLSX workbooks automatically.
    - Keeps highest revenue entry when duplicates found.
- **Interaction Preferences**:
    - Theme: Auto-detects system preference, persists user selection.
    - Professional financial dashboard aesthetic.
    - TRACER C2 branding throughout.
    - Desktop-first design, responsive for tablets/mobile.
- **Agent Working Preferences**:
    - The agent should focus on implementing features that enhance executive-level reporting and user experience without compromising data accuracy.
    - Prioritize robust data validation and error handling in all data processing tasks.
    - Ensure new features integrate seamlessly with existing architecture and design principles.
    - Avoid making changes that would break the anchor month retention calculation logic.

## System Architecture

The dashboard is built on a modern web stack designed for performance and a rich user experience.

### Tech Stack
-   **Frontend**: React 18 with TypeScript
-   **UI Framework**: shadcn/ui components and Tailwind CSS for styling
-   **Charts**: Recharts for data visualization
-   **CSV Processing**: PapaParse library for client-side CSV parsing
-   **Storage**: PostgreSQL database (Neon-backed) with Drizzle ORM for permanent data persistence
-   **API**: Express.js REST API with validation (Zod schemas)
-   **Date Handling**: date-fns for robust date operations
-   **Backend**: Express.js server with REST API routes and database integration.

### Design System
-   **Branding**: Incorporates TRACER C2 brand colors: navy blue (#1A3A52) and green (#7FA848).
-   **Typography**: Uses Inter (sans-serif) for general text and JetBrains Mono for data displays.
-   **Theming**: Supports both light and dark modes.
-   **Responsiveness**: Designed to adapt across mobile, tablet, and desktop viewports.

### Core Features and Implementations
-   **Data Processing**:
    -   Multi-file drag-and-drop upload for `.csv` and `.xlsx` files.
    -   Automatic conversion of Excel files to CSV.
    -   Multi-sheet XLSX processing and automatic title row detection in CSVs.
    -   Automatic processor and month detection from filenames/sheet names.
    -   Flexible column mapping:
        -   TRX format: Client, Dba, ProcessingDate
        -   PayBright format: Merchant Id, Merchant Name, Transaction, Net, %, Bank Payout, Branch ID
    -   Deduplication: Keeps the highest revenue entry for duplicate merchant IDs.
    -   Comprehensive validation and user-friendly error messages.
-   **Analytics Calculations**:
    -   Calculates retention rate, attrition rate, month-over-month revenue growth, revenue per account, net account growth, and top 10 merchants by revenue.
    -   **Anchor Month Strategy**: Implements logic for accurate retention calculations across filtered date ranges by including the preceding month as an anchor.
-   **Dashboard Views**:
    -   **Overview Tab**: Aggregated metrics across all processors.
    -   **Processor Tabs**: Individual analytics for each processor.
    -   **Compare Tab**: Side-by-side processor comparison with pie charts.
    -   Visualizations include revenue trends, account activity (stacked bars), and retention rates.
    -   Sortable tables for top merchants.
    -   **CEO-Level Analytics**: Includes revenue concentration card, at-risk merchant reports, 3-month revenue forecast using linear regression, branch performance leaderboard, and trending merchants (top gainers/decliners).
    -   **Branch ID Filter**: Allows filtering data by specific branches or "All Branches."
    -   **Date Range Filtering**: Smart date range selector with presets (Current Month, Last 3/6/12 Months, All Time, Custom Range).
-   **Data Model**: Uses `MerchantRecord` (merchantId, merchantName, salesAmount, branchId, month, processor) and `MonthlyMetrics` (totalRevenue, totalAccounts, retentionRate, etc.) schemas.

## Recent Changes (October 24, 2025)

### Database Migration - localStorage to PostgreSQL
**Issue**: User lost data after 5 hours due to browser localStorage limitations.

**Solution**: Migrated entire application to PostgreSQL database for permanent data persistence.

**Changes Made**:
1. **Database Schema**: Created three tables with Drizzle ORM:
   - `merchant_records`: Stores all merchant revenue data (merchantId, merchantName, salesAmount, branchId, month, processor)
   - `uploaded_files`: Tracks file upload history with validation status (boolean) and errors (jsonb array)
   - `merchant_metadata`: Stores merchant additional information (salesRep, accountType, industry, etc.)

2. **API Layer**: Implemented REST endpoints:
   - `GET/POST/DELETE /api/records`: Merchant data CRUD operations
   - `GET/POST/DELETE /api/files`: Upload history management
   - `GET/POST/PUT/DELETE /api/metadata/:merchantId`: Merchant metadata operations
   - All routes validate requests using Zod schemas

3. **Storage Layer**: Replaced in-memory storage with `DatabaseStorage` class:
   - Async database operations with proper error handling
   - Deduplication logic: keeps highest revenue entry per (merchantId, month, processor)
   - Batch operations for efficient data processing

4. **Frontend Updates**:
   - Replaced localStorage calls with API requests using React Query
   - Added loading states for all async operations
   - Error handling with toast notifications
   - Automatic data refresh after uploads/changes

5. **Bug Fixes**:
   - Increased Express body size limit to 50MB for large XLSX files
   - Expanded month column to varchar(20) to support various date formats
   - Fixed boolean/jsonb type handling for uploaded_files table

**Test Results**: ✅ E2E tested successfully - uploaded 102 Clearent merchants ($31,834 revenue), verified data persists across browser sessions.

### Performance Optimizations & New Features (October 24, 2025)

**Database Performance**:
1. Added unique index on `(merchant_id, month, processor)` for faster queries and constraint enforcement
2. Implemented ON CONFLICT upsert with revenue comparison to keep highest-revenue duplicates
3. Added individual indexes on merchant_id, month, processor, and branch_id columns

**Enhanced API Error Handling**:
- API routes now return detailed Zod validation errors with field paths and specific messages
- Improved user feedback for data validation failures
- Better debugging capability for data import issues

**Upload Tracking Feature** (New Tab):
- Visual dashboard showing upload status for each processor by month
- Statistics cards: Total Files Uploaded, Completion Rate, Missing Uploads
- Status grid with color-coded indicators:
  - Green checkmark: Data uploaded successfully
  - Red X: No data for processor/month
  - Yellow alert: Partial data (records without upload tracking)
- Data-driven processor and month lists (not hardcoded)
- Completion metrics calculated from actual processor-month pairs in data
- Upload status treats uploaded files as complete even before full record processing

**Mobile-Responsive Design**:
- Collapsible filter panel using Sheet component on mobile devices
- Filter button shows on screens < 1024px (lg breakpoint)
- All filter controls accessible in mobile Sheet: View selector, Branch selector, Date Range controls
- Desktop filters hidden on mobile, shown on larger screens
- Responsive grid layouts for upload tracking and data tables

**Test Results**: ✅ All features E2E tested and verified:
- Upload tracking shows accurate 100% completion rate for Clearent data
- Mobile filters work seamlessly across breakpoints
- Database performance optimizations confirmed via architect review

### Reports Feature with Partner Logo Management (October 24, 2025)

**Feature**: Co-branded PDF report generation with persistent partner logo management.

**Implementation**:
1. **Database Schema**: Added `partner_logos` table with Drizzle ORM:
   - `id`: Serial primary key
   - `partnerName`: Partner/bank name (varchar 255)
   - `logoUrl`: Base64-encoded logo data (text)
   - `createdAt`, `updatedAt`: Timestamps for tracking

2. **API Layer**: Implemented partner logo CRUD endpoints:
   - `GET /api/partner-logos`: Fetch all saved partner logos
   - `POST /api/partner-logos`: Save new partner logo with name and base64 data
   - `PUT /api/partner-logos/:id`: Update logo URL
   - `DELETE /api/partner-logos/:id`: Delete logo
   - All routes integrated with React Query for caching and invalidation

3. **Reports Page Features**:
   - Co-branded PDF generation using jsPDF and html2canvas
   - TRACER C2FS logo (built-in branding)
   - Partner/bank logo (user-uploaded, persisted to database)
   - "Powered by" logo at bottom of reports
   - Processor-specific or All Processors reporting options
   - Month-based reporting period selection
   - Real-time metrics preview before PDF generation
   - Partner logo selector: choose from saved logos or upload new ones
   - Upload dialog with partner name input, file upload, preview, and save functionality

4. **UI/UX Enhancements**:
   - Reports option added to main view selector dropdown (desktop and mobile)
   - Existing partner logo selector dropdown (appears when logos exist)
   - Upload new logo dialog with real-time preview
   - Save logo button persists to database with toast feedback
   - Loading states during PDF generation
   - Metrics preview updates dynamically based on selections

5. **Bug Fixes**:
   - Fixed render loop issue in Reports component by moving selectedMonth state update to useEffect
   - Added Reports option to desktop view selector (was only in mobile)
   - Implemented proper React Query cache invalidation for partner logos

**Test Results**: ✅ E2E tested successfully:
- Reports view accessible via view selector
- Partner name input and logo management functional
- Processor and month selectors populate from real data
- Metrics preview displays accurate data (Clearent: $11,566 revenue, 68 accounts, 98.6% retention)
- All Processors view shows combined metrics ($37,999 revenue, 207 accounts, 98.0% retention)
- Partner logos persist across browser sessions
- PDF generation triggers successfully with download

### Processor Start Date Handling (October 24, 2025)

**Feature**: Recognition of processor collection start dates to eliminate false "missing data" warnings.

**Implementation**:
- Defined processor start dates:
  - Clearent, ML, Shift4, TSYS: January 2024
  - Micamp: March 2024
  - TRX: May 2024
  - PayBright: June 2024
  
**Components Updated**:
1. **Data Validation Panel** (`data-validation-panel.tsx`):
   - Months before processor start show muted dash (-) instead of orange warning
   - No orange background highlighting for pre-collection periods
   - Distinguishes between "missing data" (should exist) and "not started" (processor not in use)

2. **Upload Tracking** (`upload-tracking.tsx`):
   - Months before processor start show gray dash (Minus icon) instead of red X
   - Updated legend with "Not Started Yet" indicator
   - Upload completion rates only count months after processor start dates

**User Impact**:
- TRX no longer shows missing data warnings for Jan-Apr 2024 (started May 2024)
- Micamp no longer shows missing data warnings for Jan-Feb 2024 (started March 2024)
- Clearer distinction between genuine data gaps vs. pre-collection periods

## External Dependencies

-   **Payment Processors**: Clearent, ML, Shift4, TSYS (Global Payments), Micamp, PayBright, TRX (data integrated from these platforms via CSV/XLSX uploads).
-   **Frontend Libraries**: React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, PapaParse, date-fns, xlsx (for Excel processing), @tanstack/react-query.
-   **Backend Libraries**: Express.js, Drizzle ORM, @neondatabase/serverless, zod.
-   **Database**: PostgreSQL (Neon-backed) for permanent data storage.