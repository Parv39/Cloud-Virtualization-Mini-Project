# Smart Retail Intelligence Platform — Dataset Specification & Format Guide

## MCA Data Analytics Minor Project

---

## 1. Supported File Formats
- Comma-Separated Values (`.csv`) with UTF-8, Latin-1, or ISO-8859-1 encodings.
- Microsoft Excel Workbooks (`.xlsx` or `.xls`).
- Maximum file size: 50 MB (configurable).

---

## 2. Standard Column Mapping Dictionary

The platform includes an intelligent semantic column detection engine. The table below outlines standard business fields, expected data types, and common raw aliases recognized automatically:

| Target Field | Expected Type | Description | Common Column Aliases Recognized |
| :--- | :--- | :--- | :--- |
| `order_id` *(Required)* | String | Unique transaction/invoice identifier | `InvoiceNo`, `Order_ID`, `TransactionId`, `BillNo`, `Order Number` |
| `order_date` *(Required)*| Date/Datetime | Date or timestamp of the transaction | `InvoiceDate`, `Order_Date`, `Date`, `TransactionDate`, `Timestamp` |
| `product_id` | String | Unique product SKU or identifier | `StockCode`, `Product_ID`, `ItemCode`, `SKU`, `Product_Code` |
| `product_name` *(Required)*| String | Descriptive name of the retail item | `Description`, `Product_Name`, `Item_Name`, `Title`, `Product` |
| `category` | String | Product department or category | `Category`, `Dept`, `Department`, `Item_Category`, `Product_Type` |
| `quantity` *(Required)* | Integer | Number of units purchased | `Quantity`, `Qty`, `Units`, `Units_Sold`, `Count` |
| `unit_price` *(Required)*| Float | Selling price per single unit | `UnitPrice`, `Unit_Price`, `Price`, `Rate`, `SellingPrice`, `Cost_Per_Unit` |
| `discount` | Float | Discount percentage (0-1) or absolute value | `Discount`, `Disc`, `Discount_Percent`, `Discount_Amount` |
| `total_amount` | Float | Line item or order total | `Total`, `Amount`, `LineTotal`, `Sales`, `Revenue`, `Total_Amount` |
| `customer_id` | String | Unique customer identifier | `CustomerID`, `Customer_ID`, `Client_ID`, `User_ID`, `Phone_Number` |
| `customer_name` | String | Customer full name | `Customer_Name`, `Name`, `Client_Name`, `Buyer` |
| `city` | String | City of purchase or delivery | `City`, `Town`, `Location`, `Destination` |
| `store_name` | String | Retail outlet or store identifier | `Store`, `Outlet`, `Store_Name`, `Branch`, `Shop` |
| `region` | String | Geographic zone or state | `Region`, `State`, `Zone`, `Area`, `Province` |
| `stock_quantity` | Integer | Current warehouse / shelf stock | `Stock`, `Inventory`, `Stock_Quantity`, `OnHand`, `Available_Stock` |

---

## 3. Demo Dataset: Indian Retail Sales Context

For first-time setup and academic demonstration, a realistic Indian retail dataset is generated:
- **Currency:** Indian Rupee (INR `₹`)
- **Product Catalog:** Wireless Headphones, Running Shoes, Cotton T-Shirt, Denim Jeans, Smart Watch, Laptop Backpack, Bluetooth Speaker, Stainless Steel Bottle, Ceramic Coffee Mug, Mechanical Keyboard.
- **Categories:** Electronics, Clothing, Footwear, Accessories, Home & Lifestyle.
- **Cities:** Chandigarh, Delhi, Mumbai, Bangalore, Pune, Hyderabad, Kolkata, Chennai.
- **Stores:** Chandigarh Plaza, Connaught Place Delhi, Bandra West Mumbai, Indiranagar Bangalore, Koregaon Park Pune, Banjara Hills Hyderabad.
- **Transactions:** Multi-item market baskets spanning 12 months for time-series forecasting, RFM customer segmentation, and Apriori association analysis.
- **Data Integrity:** Clearly labelled as sample data (`is_demo=True`).

---

## 4. Data Quality & Cleaning Rules
1. **Quantity Rule:** Quantities $\le 0$ are flagged (can be returned orders or negative adjustments).
2. **Price Rule:** Unit prices must be $> 0$.
3. **Missing Value Policy:**
   - Missing `customer_id`: Assigned `GUEST_CUSTOMER` so overall revenue analytics are preserved without corrupting customer RFM cohorts.
   - Missing `category`: Imputed based on known `product_name` keywords or set to `Uncategorized`.
   - Missing `store_name`: Imputed as `Online / Direct`.
4. **Date Validation:** Timestamps must be valid ISO / date formats between years 2000 and 2030.
