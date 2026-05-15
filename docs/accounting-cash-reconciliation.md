# Accounting: Cash & Reconciliation Tab

## Purpose
The **Cash & Reconciliation Tab** is used to ensure that the physical money in the drawer matches the digital records in the POS. It highlights discrepancies (variances) and tracks payment method distribution.

## How it Runs
The component focuses on "expected" totals calculated from the `paymentMethods` analytics data. It separates Cash from digital payments (Card, Mobile Money) for clear auditing.

### Key Logic
- **Variance Tracking**: Monitors the difference between the "Expected" amount (from orders) and the "Counted" amount (from physical counts). Note: Currently, the counted amount is mirrored from the expected amount as a placeholder until the manual count entry feature is fully integrated.
- **Payment Split**: Visualizes the reliance on cash vs. digital payments, which is critical for cash flow management.
- **Alert System**: Defines a variance legend (Balanced, Minor Variance, Alert) based on the discrepancy amount.

## System & DB Values Used

| Value | Source | Description |
| :--- | :--- | :--- |
| `analytics.paymentMethods` | `get-payment-methods` | The primary source for revenue per payment type and transaction counts. |
| `filters.timePeriod` | `useDashboard` | Determines the scope of the reconciliation log. |

## Future Integration
- **Manual Counts**: This tab is designed to eventually interface with a `reconciliation_logs` table where managers will save physical drawer counts at the end of every shift.
