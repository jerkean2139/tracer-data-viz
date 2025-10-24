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
    -   Flexible column mapping (e.g., TRX format: Client, Dba, ProcessingDate).
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

**Architect Recommendations**:
- Consider adding ON CONFLICT upsert for better performance
- Add database indexes on (merchant_id, month, processor) for faster queries
- Enhance API error responses for better user feedback

## External Dependencies

-   **Payment Processors**: Clearent, ML, Shift4, TSYS (Global Payments), Micamp, PayBright, TRX (data integrated from these platforms via CSV/XLSX uploads).
-   **Frontend Libraries**: React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, PapaParse, date-fns, xlsx (for Excel processing), @tanstack/react-query.
-   **Backend Libraries**: Express.js, Drizzle ORM, @neondatabase/serverless, zod.
-   **Database**: PostgreSQL (Neon-backed) for permanent data storage.