# Smart Retail Intelligence Platform — System Architecture

## MCA Data Analytics Minor Project

---

## 1. Architectural Overview

The **Smart Retail Intelligence Platform** is built as a decoupled, multi-tier, full-stack Data Analytics and Machine Learning web application. It follows a clean separation of concerns between user interface, client-side data caching, RESTful API routing, analytical data services, statistical/ML computation engines, and relational data persistence.

```
+-----------------------------------------------------------------------------------------+
|                                    PRESENTATION LAYER                                   |
|   React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Recharts + Lucide Icons |
+--------------------------------------------+--------------------------------------------+
                                             | HTTP / REST (JSON)
                                             v
+-----------------------------------------------------------------------------------------+
|                                 CLIENT-SIDE DATA LAYER                                  |
|   Axios API Client + TanStack Query (React Query) + Zod Schema Validation + Context     |
+--------------------------------------------+--------------------------------------------+
                                             | HTTP / REST (JWT Bearer Auth)
                                             v
+-----------------------------------------------------------------------------------------+
|                                   FASTAPI BACKEND API                                   |
|   CORS Middleware + Dependency Injection + OAuth2 Password Bearer JWT Authentication   |
+--------------------------------------------+--------------------------------------------+
       |                                     |                                     |
       v                                     v                                     v
+---------------+                    +---------------+                    +---------------+
| DATA PIPELINE |                    |  CORE METRICS |                    |  ML & MINING  |
| - Validation  |                    | - Sales Aggs  |                    | - RFM Engine  |
| - Preprocessor|                    | - Customers   |                    | - K-Means     |
| - Imputer     |                    | - Inventory   |                    | - Apriori MBA |
| - Deduplicator|                    | - Performance |                    | - Forecasting |
+---------------+                    +---------------+                    +---------------+
       \                                     |                                    /
        -------------------------------------+------------------------------------
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
|                                DATA PERSISTENCE LAYER                                   |
|   SQLAlchemy 2.0 ORM + Pydantic v2 Models + PostgreSQL / SQLite Relational Database     |
|   (Complete multi-tenant dataset isolation via `dataset_id` foreign key scoping)        |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Core Workflow & Pipeline Stages

1. **Dataset Ingestion:**
   - User uploads a raw retail dataset (`.csv` or `.xlsx`).
   - File integrity, extension, size, and magic headers are validated.
   - Raw records are saved to an audit storage directory for reproducibility.

2. **Intelligent Inspection & Preview:**
   - First 10-20 rows are extracted and analyzed.
   - Column types (dates, floats, integers, strings) are inferred.
   - Semantic column matcher identifies candidate business fields (e.g., `InvoiceNo` -> `order_id`, `Quantity` -> `units_sold`, `UnitPrice` -> `unit_price`, `Description` -> `product_name`).

3. **Validation & Quality Reporting:**
   - Detects missing values, duplicate transaction rows, negative quantities, invalid dates, and statistical anomalies.
   - Computes a comprehensive Data Quality Score (0-100%) and categorizes quality findings.

4. **Cleaning & Transformation:**
   - User reviews and confirms column mappings.
   - Missing data imputation or row dropping (configurable).
   - Date standardisation to ISO-8601 UTC.
   - Calculation of derived fields: `gross_amount = quantity * unit_price`, `discount_amount`, `net_amount = gross_amount - discount_amount`.

5. **Relational Storage:**
   - Cleaned normalized transactions, items, customers, and products are committed to the database, strictly scoped to the active `dataset_id`.

6. **Analytics & Machine Learning Computations:**
   - **Main Dashboard & Sales:** Time-series aggregation, sales by category, top performers, AOV, margins.
   - **Customer Analytics:** Purchase frequencies, retention rates, repeat rates, customer lifetime value.
   - **RFM Segmentation:** Recency (days since last purchase), Frequency (order count), Monetary (total spend) quintiles (1-5) and rule-based segment classification (Champions, Loyalists, At Risk, etc.).
   - **Market Basket Analysis (Apriori):** Frequent itemset generation and association rules (Support, Confidence, Lift).
   - **Demand Forecasting:** Chronologically split historical time-series trained using Holt-Winters / Exponential Smoothing / ARIMA / Moving Average baselines with MAE, RMSE, and MAPE metrics.
   - **Inventory Intelligence:** Stock turnover, low-stock threshold alerting, safety stock, and reorder point calculations.

7. **Insights & Report Generation:**
   - Rule-based business intelligence engine generates human-readable diagnostic recommendations.
   - PDF, Excel, and CSV export generation containing calculated analytics.

---

## 3. Technology Stack Justification

| Technology | Role | Justification |
| :--- | :--- | :--- |
| **React 18 + TypeScript** | Frontend UI | High type-safety, reactive state rendering, scalable enterprise frontend development. |
| **Tailwind CSS** | Styling | Rapid utility-first design, consistent dark/light mode palette, modern enterprise SaaS look. |
| **Framer Motion** | UI Transitions | Fluid, accessible transitions, card entrance animations, sidebar collapsible states. |
| **Recharts** | Visualizations | Declarative SVG charting with native React integration, responsive containers, and crisp dark/light styling. |
| **FastAPI** | Backend Framework | High-performance asynchronous Python framework with native OpenAPI/Swagger generation and Pydantic validation. |
| **Pandas & NumPy** | Data Processing | Industry standard vectorized operations for tabular data manipulation, quality checks, and aggregations. |
| **Scikit-learn** | Machine Learning | Robust, battle-tested algorithms for clustering (K-Means), scaler transformations, and regression. |
| **Statsmodels** | Time-Series Forecasting| Rigorous statistical modeling (ARIMA, Exponential Smoothing) with standard time-series splits and error evaluations. |
| **Mlxtend** | Association Mining | Apriori algorithm and association rule extraction with support, confidence, and lift metrics. |
| **SQLAlchemy 2.0** | ORM & Database Layer | Enterprise relational persistence with clean connection pooling, dialect abstraction, and schema migrations. |
| **ReportLab** | Document Generation | Programmatic PDF report rendering with tables, headers, and formatted analytical summaries. |

---

## 4. Multi-Dataset Isolation Pattern

To satisfy the strict academic and business requirement that datasets must never contaminate each other:
- Every table (`transactions`, `customers`, `products`, `inventory`, `forecasts`, `rfm_scores`) includes a foreign key `dataset_id`.
- All analytics queries strictly filter on `WHERE dataset_id = :active_dataset_id`.
- When a user selects a dataset in the global frontend selector, the dataset context updates, and all TanStack Query caches invalidate and re-fetch for the new `dataset_id`.
