# Accounting: Payroll Tab

## Purpose
The **Payroll Tab** monitors labor efficiency and staff compensation. It correlates time-tracking (shifts) with financial expenditures to provide a clear picture of labor costs.

## How it Runs
This is one of the more complex tabs, as it merges data from three different sources: Users, Shifts, and Expenses.

### Key Logic
- **Heuristic Payroll Filtering**: Since payroll is logged as an expense, this tab filters the general expense list for keywords such as `salary`, `wage`, `payroll`, `staff`, etc.
- **Labor % Calculation**: Determines what percentage of total revenue is being spent on staff. A target of <35% is typically monitored.
- **Shift Integration**: Fetches all shifts to calculate total hours worked per staff member.
- **Individual Pay Matching**: Attempts to match specific expenses to individual users by checking if the username appears in the expense description.

## System & DB Values Used

| Value | Source | Description |
| :--- | :--- | :--- |
| `users` | `get-users` | List of all staff members to populate the breakdown table. |
| `shifts` | `get-all-shifts` | Used to calculate `total_hours` worked per employee. |
| `expenses` | `get-expenses` | Filtered for payroll keywords to determine total labor cost. |
| `stats.revenue` | `get-dashboard-stats` | The denominator for the "Labor Cost %" metric. |

## Target Metrics
- **Labor Cost %**: Color-coded indicator (Green if <= 35%, Red if > 35%).
- **Average Rate/Hr**: Calculated per staff member based on their total hours vs. their matched expenses.
