# Accounting: Income Tab

## Purpose
The **Income Tab** is focused on revenue generation analysis. it provides detailed visualizations of where the money is coming from, which products are driving sales, and how revenue trends over time.

## How it Runs
The component utilizes `chart.js` (via `react-chartjs-2`) to render interactive Bar and Doughnut charts. It maps raw analytics data into chart datasets and displays a high-density table of top-performing products.

### Key Logic
- **Trend Analysis**: Maps `salesData` to a Bar chart to show daily revenue fluctuations within the selected time period.
- **Categorical Split**: Uses a Doughnut chart to visualize the percentage of revenue contributed by different departments (e.g., Food vs. Bar).
- **Product Rankings**: Sorts and displays products by revenue to identify "Star" items.

## System & DB Values Used

| Value | Source | Description |
| :--- | :--- | :--- |
| `analytics.salesData` | `get-sales-analytics` | Array of objects containing `date`, `revenue`, and `orders`. |
| `analytics.categoryPerformance` | `get-category-performance` | Revenue and percentage share per category. |
| `analytics.topProducts` | `get-top-products` | List of products with units sold and total revenue generated. |
| `stats.revenue` | `get-dashboard-stats` | Total revenue used for summary cards and chart centers. |

## Interactive Features
- **Time Period Filtering**: The charts automatically refresh when the global `timePeriod` (Day, Week, Month) is changed in the header.
