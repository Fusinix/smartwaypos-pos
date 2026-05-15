# Accounting: Tax Tab

## Purpose
The **Tax Tab** automates the calculation of statutory tax liabilities. It provides the business with an estimated "Net Payable" amount for government filing.

## How it Runs
The component applies fixed tax rates to the gross revenue fetched from the backend. It provides a detailed breakdown of multi-layered taxes common in the region.

### Key Logic
- **Formulaic Calculation**: All tax lines are derived from `stats.revenue` using the following rates:
    - **VAT**: 12%
    - **NHIL**: 2.5%
    - **GETFL**: 2.5%
    - **Tourism Levy**: 1%
    - **Total Effective Rate**: ~18%
- **Filing History**: Includes a table for historical filings (currently placeholder logic awaiting a dedicated `tax_filings` DB table).

## System & DB Values Used

| Value | Source | Description |
| :--- | :--- | :--- |
| `stats.revenue` | `get-dashboard-stats` | The base amount for all tax calculations. |
| `analytics.salesData` | `get-sales-analytics` | Used to generate the "Monthly Tax Due" trend chart. |

## Important Note
The values in this tab are **estimates** based on gross sales. They do not account for deductible input VAT from business purchases unless those are explicitly linked in the future.
