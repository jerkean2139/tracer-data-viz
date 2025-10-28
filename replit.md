# TRACER C2 Merchant Account Analytics Dashboard

## Overview

The TRACER C2 Merchant Account Analytics Dashboard is a professional business intelligence tool designed to track retention, revenue, and growth metrics across seven payment processors: Clearent, ML, Shift4, TSYS (Global Payments), Micamp, PayBright, and TRX. Its primary purpose is to provide visual analytics suitable for bank partners and executive presentations, offering insights into merchant services operations. The project aims to deliver a comprehensive, user-friendly platform for analyzing merchant performance with a focus on executive-level reporting and user experience.

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
-   **Frontend**: React 18 with TypeScript, shadcn/ui components, Tailwind CSS, Recharts, PapaParse, date-fns, @tanstack/react-query.
-   **Backend**: Express.js server with REST API routes, Zod schemas for validation.
-   **Database**: PostgreSQL (Neon-backed) with Drizzle ORM.

### Design System
-   **Branding**: TRACER C2 brand colors: navy blue (#1A3A52) and green (#7FA848).
-   **Typography**: Inter (sans-serif) for general text and JetBrains Mono for data displays.
-   **Theming**: Supports light and dark modes, auto-detects system preference.
-   **Responsiveness**: Designed for desktop-first, adapting to tablet and mobile viewports.

### Core Features
-   **Data Processing & Storage**:
    -   Multi-file drag-and-drop upload for `.csv` and `.xlsx` files.
    -   Automatic conversion of Excel files to CSV and multi-sheet processing.
    -   Flexible column mapping and automatic processor/month detection.
    -   Deduplication logic prioritizing highest revenue entries.
    -   Persistent data storage in PostgreSQL with `merchant_records`, `uploaded_files`, and `merchant_metadata` tables.
    -   Processor start date recognition to prevent false "missing data" warnings.
-   **Analytics & Reporting**:
    -   Calculates retention rate, attrition rate, month-over-month revenue growth, revenue per account, net account growth, and top 10 merchants.
    -   **Anchor Month Strategy**: Ensures accurate retention calculations by including preceding months.
    -   **CEO-Level Analytics**: Includes revenue concentration, at-risk merchants, 3-month revenue forecast, branch performance, and trending merchants.
    -   Co-branded PDF report generation using `jsPDF` and `html2canvas`, supporting user-uploaded partner logos.
-   **Dashboard Views**:
    -   Overview, Processor-specific, and Compare tabs for aggregated and individual processor insights.
    -   Upload Tracking dashboard to monitor data ingestion status by processor and month.
    -   Smart date range selector and Branch ID filtering across all views and reports.

## External Dependencies

-   **Payment Processors**: Clearent, ML, Shift4, TSYS (Global Payments), Micamp, PayBright, TRX (data sourced from these platforms via file uploads).
-   **Frontend Libraries**: React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, PapaParse, date-fns, xlsx, @tanstack/react-query.
-   **Backend Libraries**: Express.js, Drizzle ORM, @neondatabase/serverless, zod.
-   **Database**: PostgreSQL (Neon-backed).