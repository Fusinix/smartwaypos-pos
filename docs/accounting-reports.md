# Accounting: Reports Tab

## Purpose
The **Reports Tab** is the data extraction gateway for the application. It allows users to generate and download standardized financial documents for accounting, auditing, and tax purposes.

## How it Runs
The component provides UI "cards" for different report types and a "Custom Generator" for date-range specific exports. It interfaces directly with the Electron file system services.

### Key Logic
- **Report Presets**: Offers quick access to P&L, Expense, Payroll, Tax, and Cash Flow reports.
- **Custom Generation**: Allows the user to select a `fromDate`, `toDate`, and `reportType` to create a bespoke dataset.
- **IPC Triggering**: Translates UI selections into backend commands to generate files on the local machine.

## System & DB Values Used

| Value | Source | Description |
| :--- | :--- | :--- |
| `filters` | `useDashboard` | The active global filters (timePeriod) used for quick-export presets. |
| `fromDate` / `toDate` | Local State | User-defined ranges for custom report generation. |

## IPC Methods
- **`export-data`**: The primary method used. It accepts:
    - `type`: (e.g., 'dashboard', 'sales', 'expenses', 'payroll', 'tax', 'cash')
    - `format`: ('csv' or 'pdf')
    - `filters`: The date range objects (`startDate`, `endDate`).

## Behavior
When an export is triggered, the Electron main process typically gathers the requested data from the DB, formats it according to the requested file type, and prompts the user to save the file to their computer.
