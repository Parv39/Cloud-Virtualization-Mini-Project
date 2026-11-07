# Smart Retail Intelligence Platform — Testing & Verification Report

## MCA Data Analytics Minor Project

---

## 1. Test Suite Summary

- **Total Test Cases Planned:** 45+
- **Unit & Logic Tests:** Analytics computations, RFM quintile algorithms, Apriori mining, time-series splitting, data sanitization.
- **API Integration Tests:** Authentication flow, file ingestion, column mapping, dashboard metrics, filter scoping.
- **End-to-End Validation:** Full user journey from raw CSV/Excel upload to multi-period forecasting and PDF export.

---

## 2. Test Execution Log

| Test ID | Module | Description | Test Type | Status | Verified Values / Metrics |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-AUTH-01` | Auth | User Registration & Password Hashing | Integration | Pending | Bcrypt salt verification |
| `TC-AUTH-02` | Auth | JWT Token Generation & Protected Routes | Integration | Pending | Bearer token validation |
| `TC-DATA-01` | Ingestion | CSV Upload & File Type Validation | Integration | Pending | MIME & extension security |
| `TC-DATA-02` | Ingestion | Column Detection & Semantic Alias Mapping | Unit | Pending | Match confidence scoring |
| `TC-DATA-03` | Quality | Negative Quantity / Invalid Price Detection | Unit | Pending | Flagged anomalies table |
| `TC-DATA-04` | Clean | Data Cleaning & Derived Metric Calculation | Unit | Pending | Gross, Discount, Net formula |
| `TC-DASH-01` | Dashboard| KPI Calculation Consistency | Integration | Pending | Total Revenue, Profit, AOV |
| `TC-SALES-01`| Sales | No Double-Counting Order vs Item Level | Unit | Pending | Order header vs items check |
| `TC-CUST-01` | Customers| Repeat Purchase Rate & Customer CLV | Unit | Pending | Retention math verified |
| `TC-RFM-01`  | RFM | Recency, Frequency, Monetary Quintile (1-5) | Unit | Pending | Exact 1-5 boundary bins |
| `TC-RFM-02`  | RFM | Segment Rule Assignment (Champions, etc.) | Unit | Pending | Documented RFM rules |
| `TC-MBA-01`  | Apriori | Market Basket Support, Confidence, Lift | Unit | Pending | Co-occurrence validation |
| `TC-FC-01`   | Forecast| Chronological Split & Error Metrics | Unit | Pending | MAE, RMSE, MAPE $\ge 0$ |
| `TC-INV-01`  | Inventory| Stock Turnover & Reorder Alert Trigger | Unit | Pending | Safety stock threshold |
| `TC-REP-01`  | Reports | PDF, Excel & CSV File Generation | Integration | Pending | Content matches live DB |
| `TC-ISO-01`  | Multi-Tenancy| Dataset Switching & Data Isolation | E2E | Pending | Zero cross-contamination |

---

## 3. Calculation Correctness Benchmarks
All calculations performed by backend services will be cross-checked against independent standard reference calculations in `tests/test_analytics_math.py`.
