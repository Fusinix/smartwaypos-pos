# Accounting Page Documentation

The Accounting page in the POS application serves as the central hub for financial monitoring, expense management, and reporting. It is structured into seven distinct tabs, each providing a specialized view of the business's financial data.

## System Architecture

The page relies on a robust set of hooks that interface with the Electron main process via IPC (Inter-Process Communication). Most data is fetched dynamically based on a `timePeriod` filter (Day, Week, Month).

### Core Data Sources (IPC Invokes)
- `get-dashboard-stats`: High-level revenue and order metrics.
- `get-sales-analytics`: Detailed sales trends and product-level data.
- `get-expenses`: All logged business expenditures.
- `get-users`: Staff information for payroll context.
- `get-all-shifts`: Time-tracking data for labor cost calculations.
- `export-data`: Backend service for generating CSV/PDF reports.

## Documentation Index
Detailed descriptions for each tab can be found in the following files:

1. [Overview Tab](accounting-overview.md): High-level financial health and P&L.
2. [Income Tab](accounting-income.md): Revenue trends and product performance.
3. [Expenses Tab](accounting-expenses.md): Spending logs and category analysis.
4. [Payroll Tab](accounting-payroll.md): Labor costs and staff hour tracking.
5. [Cash & Reconciliation Tab](accounting-cash-reconciliation.md): Payment method splits and variance tracking.
6. [Tax Tab](accounting-tax.md): Tax liability estimates and breakdowns.
7. [Reports Tab](accounting-reports.md): Data export and report generation.
