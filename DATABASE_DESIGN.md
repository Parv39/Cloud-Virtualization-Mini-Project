# Smart Retail Intelligence Platform — Database Design Specification

## MCA Data Analytics Minor Project

---

## 1. Relational Schema Architecture

The database is designed with third normal form (3NF) principles where appropriate, with intentional performance indexes on frequent analytic query paths (e.g. `(dataset_id, order_date)`, `(dataset_id, customer_id)`, `(dataset_id, product_id)`).

```mermaid
erDiagram
    USERS ||--o{ DATASETS : owns
    USERS ||--o{ AUDIT_LOGS : triggers
    DATASETS ||--o{ DATASET_COLUMNS : defines
    DATASETS ||--o{ DATA_QUALITY_REPORTS : evaluates
    DATASETS ||--o{ CUSTOMERS : contains
    DATASETS ||--o{ PRODUCTS : contains
    DATASETS ||--o{ INVENTORY : tracks
    DATASETS ||--o{ TRANSACTIONS : groups
    TRANSACTIONS ||--|{ TRANSACTION_ITEMS : includes
    PRODUCTS ||--o{ TRANSACTION_ITEMS : sold_in
    CUSTOMERS ||--o{ TRANSACTIONS : places
    DATASETS ||--o{ RFM_SCORES : calculates
    DATASETS ||--o{ MARKET_BASKET_RULES : mines
    DATASETS ||--o{ FORECASTS : generates
    DATASETS ||--o{ REPORTS : exports

    USERS {
        uuid id PK
        string email UK
        string username UK
        string hashed_password
        string role
        boolean is_active
        datetime created_at
    }

    DATASETS {
        uuid id PK
        uuid user_id FK
        string name
        string file_name
        string file_type
        integer file_size_bytes
        string storage_path
        integer total_rows
        integer total_columns
        string status
        float quality_score
        datetime uploaded_at
        datetime processed_at
    }

    CUSTOMERS {
        uuid id PK
        uuid dataset_id FK
        string original_customer_id
        string customer_name
        string email
        string city
        string region
        datetime first_purchase_date
        datetime last_purchase_date
        integer total_orders
        float total_spend
    }

    PRODUCTS {
        uuid id PK
        uuid dataset_id FK
        string original_product_id
        string product_name
        string category
        float unit_price
        float unit_cost
    }

    TRANSACTIONS {
        uuid id PK
        uuid dataset_id FK
        string original_order_id
        uuid customer_id FK
        datetime order_date
        float gross_amount
        float discount_amount
        float net_amount
        float total_profit
        string store_name
        string city
        string payment_method
    }

    TRANSACTION_ITEMS {
        uuid id PK
        uuid transaction_id FK
        uuid product_id FK
        integer quantity
        float unit_price
        float discount_rate
        float total_price
        float profit
    }

    INVENTORY {
        uuid id PK
        uuid dataset_id FK
        uuid product_id FK
        integer current_stock
        integer safety_stock
        integer reorder_point
        string status
        datetime last_restocked_at
    }

    RFM_SCORES {
        uuid id PK
        uuid dataset_id FK
        uuid customer_id FK
        integer recency_days
        integer frequency_count
        float monetary_value
        integer r_score
        integer f_score
        integer m_score
        string segment_name
        string segmentation_method
        datetime calculated_at
    }

    MARKET_BASKET_RULES {
        uuid id PK
        uuid dataset_id FK
        string antecedent
        string consequent
        float support
        float confidence
        float lift
        datetime calculated_at
    }

    FORECASTS {
        uuid id PK
        uuid dataset_id FK
        string target_metric
        string model_name
        integer horizon_days
        json forecast_points
        float mae
        float rmse
        float mape
        datetime trained_at
    }
```

---

## 2. Table Specifications & Data Dictionaries

### 2.1 `users`
- Stores registered users with argon2/bcrypt-hashed credentials.
- Multi-tenancy anchor for created datasets and configuration.

### 2.2 `datasets`
- Represents an uploaded CSV or Excel dataset.
- Status values: `UPLOADED`, `MAPPING_PENDING`, `VALIDATING`, `CLEANING`, `PROCESSED`, `FAILED`.
- Includes overall data quality score (0.0 to 100.0).

### 2.3 `transactions` & `transaction_items`
- Captures order-level header data (`gross_amount`, `discount_amount`, `net_amount`, `store_name`, `order_date`) and line-item details (`quantity`, `unit_price`, `profit`).
- Eliminates common double-counting bugs between order totals and item subtotals.

### 2.4 `rfm_scores`
- Stores calculated R, F, and M values alongside assigned quintiles (1-5) and mapped segment names (`Champions`, `Loyal Customers`, `At Risk`, `Lost Customers`, etc.).
- Records whether segments were determined via rule-based RFM scoring or K-Means clustering.

### 2.5 `market_basket_rules`
- Stores association rules derived via Apriori algorithm from co-occurrence transactions.
- Filterable by minimum support, confidence, and lift.

### 2.6 `forecasts`
- Stores historical time-series evaluation metrics (MAE, RMSE, MAPE) and chronological forward predictions with upper/lower prediction bounds.

---

## 3. Database Engine Compatibility (PostgreSQL & SQLite)

The platform is designed to be 100% database engine agnostic:
- Standard types (`VARCHAR`, `INTEGER`, `FLOAT`, `TIMESTAMP`, `TEXT`, `BOOLEAN`) are used.
- UUID keys are managed as 36-character strings on SQLite and native `UUID` on PostgreSQL.
- Database configuration reads `DATABASE_URL` from the environment:
  - PostgreSQL: `postgresql://user:password@localhost:5432/retail_db`
  - Fallback: `sqlite:///./retail_intelligence.db`
- Migrations managed cleanly via Alembic.
