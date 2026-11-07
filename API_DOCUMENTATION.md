# Smart Retail Intelligence Platform — REST API Documentation

## MCA Data Analytics Minor Project

---

## 1. Authentication Endpoints

| Method | Endpoint | Description | Request Body | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | `{ "email", "username", "password", "full_name" }` | No |
| `POST` | `/api/auth/login` | Login and obtain JWT token | `OAuth2PasswordRequestForm` / `{ "username", "password" }` | No |
| `GET` | `/api/auth/me` | Fetch currently authenticated user | None | Yes |
| `POST` | `/api/auth/logout` | Invalidate token / session | None | Yes |

---

## 2. Dataset Management & Ingestion Endpoints

| Method | Endpoint | Description | Query / Form Params | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/data/upload` | Upload raw CSV/Excel file | `file: UploadFile` | Yes |
| `GET` | `/api/data/datasets` | List all available datasets | None | Yes |
| `GET` | `/api/data/datasets/{id}` | Get dataset metadata & stats | None | Yes |
| `GET` | `/api/data/{id}/preview` | Preview top 20 rows & detected columns | None | Yes |
| `POST` | `/api/data/{id}/map-columns` | Submit validated column mappings | `{ mappings: { [target]: raw } }` | Yes |
| `GET` | `/api/data/{id}/quality` | Get detailed data quality audit report | None | Yes |
| `POST` | `/api/data/{id}/process` | Clean, transform & store in database | `{ drop_invalid_rows: bool, ... }` | Yes |
| `DELETE`| `/api/data/datasets/{id}` | Delete dataset and all scoped records | None | Yes |
| `POST` | `/api/data/generate-demo` | Generate & seed Indian retail demo data | `{ row_count: 500 }` | Yes |

---

## 3. Executive Dashboard & Sales Analytics

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary` | KPI cards (Revenue, Profit, Orders, AOV, Customers) | `dataset_id`, `start_date`, `end_date`, `category` |
| `GET` | `/api/dashboard/revenue-trend` | Revenue & profit time-series for charts | `dataset_id`, `interval` (daily/monthly/weekly) |
| `GET` | `/api/dashboard/category-sales` | Revenue & units aggregated by product category | `dataset_id` |
| `GET` | `/api/dashboard/top-products` | Top-selling products by revenue and profit | `dataset_id`, `limit` |
| `GET` | `/api/sales/summary` | Detailed sales metrics & period comparisons | `dataset_id`, `date_range` |
| `GET` | `/api/sales/trends` | Multi-interval sales performance curves | `dataset_id`, `interval` |
| `GET` | `/api/sales/transactions` | Paginated, searchable transaction table | `dataset_id`, `page`, `page_size`, `search` |
| `GET` | `/api/sales/regions` | Regional & city-level sales breakdowns | `dataset_id` |

---

## 4. Customer Analytics & RFM Segmentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/customers/summary` | Unique customers, repeat rate, spend per customer, CLV |
| `GET` | `/api/customers/list` | Paginated customer table with order count & lifetime spend |
| `GET` | `/api/customers/{id}` | Detailed customer drill-down with purchase timeline |
| `GET` | `/api/customers/retention` | Cohort retention & purchase frequency distribution |
| `POST` | `/api/analytics/customer-segmentation` | Run RFM scoring & optional K-Means clustering |
| `GET` | `/api/analytics/customer-segments` | Segment distribution (Champions, At Risk, Promising, etc.) |

---

## 5. Inventory & Product Analytics

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/inventory/summary` | Total stock value, low-stock items, out-of-stock count |
| `GET` | `/api/inventory/products` | Stock inventory table with turnover ratio and days of inventory |
| `GET` | `/api/inventory/recommendations` | Reorder suggestions based on sales velocity and safety stock |
| `GET` | `/api/products` | Paginated product table with margin %, units sold, revenue |
| `GET` | `/api/products/top` | Top 10 revenue and highest margin products |

---

## 6. Machine Learning: Market Basket & Demand Forecasting

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/analytics/market-basket` | Run Apriori algorithm with min_support, min_confidence, min_lift |
| `GET` | `/api/analytics/market-basket/rules` | Association rules (Antecedents, Consequents, Support, Confidence, Lift) |
| `POST` | `/api/analytics/forecast` | Train time-series model (Exponential Smoothing / ARIMA / MA) |
| `GET` | `/api/analytics/forecast/history` | Historical actual vs. predicted values + evaluation metrics (MAE, RMSE, MAPE) |

---

## 7. Reports & Insights Engine

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/insights/recommendations` | Dynamic rule-based diagnostic business recommendations |
| `POST` | `/api/reports/generate` | Generate comprehensive report (PDF / Excel / CSV) |
| `GET` | `/api/reports/{id}/download` | Stream binary generated report |
