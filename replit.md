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
-   **Authentication & Role-Based Access Control**:
    -   **Username/Password Authentication**: Session-based authentication with PostgreSQL session storage and bcrypt password hashing.
    -   **Initial Setup**: First-time visitors see a setup form to create the initial admin user.
    -   **Role-Based Security**: Three roles (admin, partner, agent) with differential access to revenue data.
    -   **Revenue Hiding**: Total revenue metrics are hidden from non-admin users in both dashboard and PDF reports.
    -   **Protected Routes**: All data endpoints require authentication; unauthenticated requests return 401.
    -   **Centralized Password Security Architecture**:
        -   **Auth Utilities** (`server/auth-utils.ts`): All password hashing and verification centralized in dedicated functions
        -   **Storage Layer Hashing**: Passwords hashed exclusively in storage layer (`createLocalUser`, `updateUserPassword`)
        -   **Type Safety**: Storage methods type-restricted to prevent credential field bypass (`updateUser` only accepts firstName/lastName/role)
        -   **Runtime Validation**: Zod schemas with `.strict()` mode reject any requests containing `passwordHash` field
        -   **Defense in Depth**: Multiple layers of protection (type system + runtime validation + server-side guards)
        -   **Replit Auth Separation**: `upsertUser` method restricted to `ReplitUpsertUser` type, strips credentials with server guards
        -   Bcrypt hashing with 10 rounds, all hashes verified to be in database (never plaintext)
    -   **Security Features**: 
        -   All data routes protected with `requireAuth` middleware
        -   Hardened password presence checks (filters null/empty/whitespace hashes)
        -   Admin-only role management with Zod schema validation
        -   Prevention of privilege escalation and self-demotion
        -   Public signup restricted to 'agent' role (lowest privilege)
        -   Secure session cookies with HttpOnly, Secure flags
    -   **Legacy Compatibility**: Old Replit Auth users (without passwords) are preserved but don't block admin seeding.
    -   **Known Limitations**: Rate limiting and CSRF protection planned for production deployment.
-   **Data Processing & Storage**:
    -   Multi-file drag-and-drop upload for `.csv` and `.xlsx` files.
    -   Automatic conversion of Excel files to CSV and multi-sheet processing.
    -   Flexible column mapping and automatic processor/month detection.
    -   Deduplication logic prioritizing highest revenue entries.
    -   Persistent data storage in PostgreSQL with `merchant_records`, `uploaded_files`, `merchant_metadata`, `users`, and `sessions` tables.
    -   Processor start date recognition to prevent false "missing data" warnings.
-   **Analytics & Reporting**:
    -   Calculates retention rate, attrition rate, month-over-month revenue growth, revenue per account, net account growth, and top 10 merchants.
    -   **Anchor Month Strategy**: Ensures accurate retention calculations by including preceding months.
    -   **CEO-Level Analytics**: Includes revenue concentration, at-risk merchants, 3-month revenue forecast, branch performance, and trending merchants.
    -   **Role-Based Reporting**: Co-branded PDF reports automatically exclude revenue data for non-admin users.
-   **Dashboard Views**:
    -   Overview, Processor-specific, and Compare tabs for aggregated and individual processor insights.
    -   Upload Tracking dashboard to monitor data ingestion status by processor and month.
    -   Smart date range selector and Branch ID filtering across all views and reports.
    -   User profile component with role display and logout functionality.

## Processor Start Dates (Anchor Months)

Each processor has a different start date, which serves as the "anchor month" for retention calculations:

-   **Clearent**: January 2024 (2024-01) - 21 months of data through September 2025
-   **ML**: January 2024 (2024-01) - 19 months of data through July 2025
-   **Shift4**: January 2024 (2024-01) - 21 months of data through September 2025
-   **TSYS**: January 2024 (2024-01) - 21 months of data through September 2025 (complete coverage)
-   **Micamp**: March 2024 (2024-03) - 19 months of data through September 2025
-   **PayBright**: June 2025 (2025-06) - 4 months of data through September 2025
-   **TRX**: May 2024 (2024-05) - 17 months of data through September 2025
-   **Payment Advisors**: January 2025 (2025-01) - 7 months of data through July 2025

These start dates are critical for accurate retention calculations and prevent false "missing data" warnings for months before a processor began operations with TRACER C2.

**Latest Import Updates (November 14, 2025)**: 
- September 2024 corrected for all 6 active processors (189 records, $5.05M) - ✅ RESOLVED
- TRX April-July 2025 (190 records, $2.7M) - ✅ RESOLVED
- ML April-July 2025 (70 records, $903K) - ✅ RESOLVED
- Micamp May-July 2025 (64 records, $705K) - ✅ RESOLVED
- August and September 2025 data imported for all processors (361 records)
- Payment Advisors Jan-July 2025 (23 records, $803K)

**Current Database Status**:
- Total Records: 3,731 across 8 processors
- Total Sales: $90.6M (Jan 2024 - Sep 2025)
- Complete Coverage: TSYS, Clearent, Shift4, PayBright, Payment Advisors (100%)
- Nearly Complete: ML (missing Aug-Sep 2025), TRX (100% since May 2024 start)
- Known Gap: ⚠️ Micamp April 2025 missing

**Data Quality Notes**:
- September 2024 CSV parsing failure - ✅ RESOLVED (all 6 processors restored, $5.05M)
- TRX April-July 2025 $0 sales issue - ✅ RESOLVED ($2.7M restored)
- ML April-July 2025 incomplete data - ✅ RESOLVED (increased from 2 to 16-19 records/month)
- Micamp May-July 2025 incomplete data - ✅ RESOLVED (increased from 6-7 to 20-22 records/month)
- Upload Tracking dashboard shows actual data coverage with 4-tier status system:
  - Green checkmark: Complete data with valid sales amounts
  - Yellow warning: Records exist but $0 sales (data quality issue)
  - Red X: No records uploaded
  - Gray dash: Before processor start date

## External Dependencies

-   **Payment Processors**: Clearent, ML, Shift4, TSYS (Global Payments), Micamp, PayBright, TRX, Payment Advisors (data sourced from these platforms via file uploads).
-   **Frontend Libraries**: React, TypeScript, Tailwind CSS, shadcn/ui, Recharts, PapaParse, date-fns, xlsx, @tanstack/react-query.
-   **Backend Libraries**: Express.js, Drizzle ORM, @neondatabase/serverless, zod.
-   **Database**: PostgreSQL (Neon-backed).