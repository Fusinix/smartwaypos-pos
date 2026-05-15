# Accounting: Expenses Tab

## Purpose
The **Expenses Tab** is the primary interface for tracking business outflows. It allows staff to log new expenditures and provides a historical audit trail of all spending.

## How it Runs
This tab combines a data entry form with a historical log table. It also includes a spending analysis chart to show where the majority of capital is being allocated.

### Key Logic
- **Expense Logging**: Validates and sends new expense records to the database via Electron.
- **Real-time Summation**: Calculates the total expenditure for the current view and determines the "Revenue Impact" (Expenses vs. Total Revenue).
- **Categorization**: Groups expenses into types (Supplier, Payroll, Rent, Utilities, Other) for visualization.

## System & DB Values Used

| Value | Source | Description |
| :--- | :--- | :--- |
| `expenses` | `get-expenses` | The array of all expense records for the filtered date. |
| `stats.revenue` | `get-dashboard-stats` | Used to calculate the percentage of revenue consumed by expenses. |
| `user` | `AuthContext` | Captures the `admin_id` and `admin_name` of the person logging the expense. |

## IPC Methods
- **`add-expense`**: Invoked when a user clicks the "Add" button. Sends `description`, `amount`, `admin_name`, `admin_id`, and `category` to the DB.
- **`get-expenses`**: Called automatically to populate the log table.
