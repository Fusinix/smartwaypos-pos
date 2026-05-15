# Accounting: Overview Tab

## Purpose
The **Overview Tab** provides a "bird's-eye view" of the business's financial performance. It is designed for managers to quickly assess profitability, recent expenses, and estimated tax liabilities without diving into granular logs.

## How it Runs
The component aggregates data from the `stats`, `analytics`, and `expenses` props. It uses a series of `StatCard` components for key metrics and specialized sections for P&L and Cost Analysis.

### Key Logic
- **Profit Calculation**: Calculates `Net Profit` in real-time by subtracting the total of all fetched expenses from the gross revenue.
- **Cost Ratios**: Dynamically calculates the "Prime Cost" percentage (Total Expenses / Revenue) to help monitor efficiency.
- **Tax Estimation**: Provides a quick calculation of VAT (12%) based on current gross revenue.

## System & DB Values Used

| Value | Source | Description |
| :--- | :--- | :--- |
| `stats.revenue` | `get-dashboard-stats` | The total income for the selected period. |
| `stats.revenueChange` | `get-dashboard-stats` | Percentage comparison against the previous period. |
| `expenses` | `get-expenses` | Used to sum all costs and display the 5 most recent entries. |
| `analytics.categoryPerformance` | `get-category-performance` | Breakdown of sales by category (e.g., Bar, Kitchen) for the P&L statement. |
| `analytics.paymentMethods` | `get-payment-methods` | Summary of income split by payment type. |

## Interactive Features
- **Exporting**: Triggers `window.electron.invoke('export-data', ...)` with the `dashboard` type to download a P&L summary.
