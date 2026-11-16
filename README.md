# ChaiCraft — Production-Ready Tea Business Management System

A centralized, enterprise-grade web application designed and built for tea manufacturing and packaging enterprises (10–15 workers). The system replaces manual registers, paper logs, disconnected spreadsheets, and fragmented WhatsApp communication with one unified, role-based business platform.

---

## 🍵 Demo Login Credentials

You can test the application immediately using the pre-seeded demo accounts (or use the 1-click login buttons on the login page):

| Role | Email | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Owner / Admin** | `owner@chaibusiness.com` | `password123` | **Full access**: Financial metrics, profit analytics, worker salaries, audit logs, system users, settings. |
| **Manager** | `manager@chaibusiness.com` | `password123` | **Operations**: Production batching, staff daily attendance, orders, inventory stock adjustments, dispatches, purchases. |
| **Sales Staff** | `sales1@chaibusiness.com` | `password123` | **Sales & Dues**: Customer / dealer directory, order creation, payment recording, customer dues & ledgers. |
| **Sales Staff 2** | `sales2@chaibusiness.com` | `password123` | **Sales & Dues**: Alternate sales executive account. |
| **Worker** | `worker@chaibusiness.com` | `password123` | **Self-Service**: Personal work profile, daily check-in/out records, assigned production tasks. (Financial data restricted). |

---

## 🚀 Key Modules & Business Features

### 1. Executive Business Dashboard
- **Today's Overview**: Live sales revenue, orders count, packets produced, payments received, present workers, and pending dispatches.
- **Critical Alerts**: Real-time alerts for low-stock tea blends or pouches, overdue dealer payments, and batches nearing 30-day shelf expiry.
- **Analytics & Trends**: 7-day sales trend graph, top-selling tea blends, top dealers by purchasing volume, and estimated monthly profit (Revenue − COGS − Operational Expenses).

### 2. Inventory & Stock Management (Finished Packets & Raw Materials)
- Distinct tracking for:
  - **Finished Tea Products**: 100g, 250g, 500g, 1kg pouches, specialty blends (Assam CTC Gold, Darjeeling First Flush, Royal Masala Chai, Green Tea).
  - **Raw Materials**: Bulk tea leaf (kg), flavoring spices, 3-ply foil standup pouches, master corrugated cartons.
- **Stock Adjustment Modal**: For physical count reconciliation or moisture/damage with required justification notes.
- **Immutable Stock Transaction Log**: Every movement is recorded with previous stock, new stock, delta, reason, and responsible user.
- **Negative Stock Protection**: Guaranteed prevention of negative warehouse balances.

### 3. Tea Production & Batching Module
- Create production batches with unique sequential batch numbers (`TB-YYYY-XXX`).
- **Recipe Consumption Engine**: Define raw material consumption (e.g., 230 kg Assam bulk leaf + 20 kg spices + 1000 pouches).
- **Automated Inventory Updates**: Marking a batch as `Completed` automatically adds finished packets to inventory and deducts raw materials from warehouse stock.
- Yield tracking (planned vs actual output percentage).

### 4. Sales, Billing & Professional Invoicing
- Sequential tax invoices (`SO-YYYY-XXXX`).
- Multi-product line items with automatic subtotal, customizable trade discount, and GST calculation (5% tea standard, 12%, 18%).
- Order status lifecycle: `Pending` → `Confirmed` → `Processing` → `Packed` → `Dispatched` → `Delivered` → `Cancelled`.
- **Atomic Stock Deduction**: Stock is deducted upon packing/dispatch; cancelling an order safely restores reserved stock.
- **Printable Tax Invoice**: Professional tax invoice with tea brand header, HSN codes (0902), customer GSTIN, bank RTGS/NEFT/UPI details, and signature blocks.

### 5. Dealer / Distributor & Customer Management
- Track wholesalers, distributors, and retailers across regions (Kanpur, Lucknow, Varanasi, Jaipur, etc.).
- Credit limits, payment terms (e.g. 15–30 days), and live outstanding balance.
- **Chronological Account Statement / Ledger**: Displays all sales invoices (debits), payment receipts (credits), and running balances.

### 6. Purchase & Supplier Management
- Tea estates (Assam, Darjeeling) and packaging suppliers.
- Purchase orders (`PO-YYYY-XXXX`).
- **Automated Stock Intake**: Marking a PO as `Received` automatically increments raw material stock in the warehouse.
- Supplier ledger & outstanding payables tracking.

### 7. Credit & Due Management
- Dedicated receivables & payables dashboard.
- Immediate payment recording (Cash, UPI, NEFT, Cheque) with auto-generated receipt numbers (`REC-YYYY-XXXX`).
- Atomically reduces dealer dues or supplier payables.

### 8. Worker Management & Daily Attendance
- Factory staff profiles (10–15 workers across Packaging, Blending, Warehouse, QC, Maintenance).
- **Daily Attendance Roster**: 1-click status marking for `Present`, `Half Day`, `Absent`, `Leave` with automatic shift times.
- **Monthly Attendance Analytics**: Attendance percentage and absence tracking.
- **Salary & Advance Tracking**: Owner-restricted tracking of monthly salaries, advances given, deductions, and payouts.

### 9. Operational Expense Tracking
- Categories: Transport freight, electricity, generator diesel, maintenance, packaging consumables, salaries, rent.
- Category breakdown cards and monthly trend analysis.

### 10. Expiry & Reminder System
- Alerts for upcoming batch shelf expirations, FSSAI manufacturing licenses, GST GSTR-3B filings, and weighing scale calibrations.

### 11. Business Reports & Audit Trail
- Sales, Inventory Valuation, and Dealer Aging reports with 1-click CSV export.
- Immutable Owner Audit Log tracking all critical state transitions, user logins, and adjustments.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Tailwind CSS, Lucide React icons, Recharts.
- **Backend**: Node.js, Express.js (MVC architecture), JWT Authentication, Role-based Authorization, Centralized Error Handling.
- **Database**: MongoDB with Mongoose ODM, indexed schemas, and relational references.
- **Testing**: Jest & Supertest integration test suite covering end-to-end business rules.

---

## 💻 Running the Application Locally

### Prerequisites
- Node.js (v18+ or v20+)
- MongoDB running locally on `mongodb://127.0.0.1:27017`

### 1. Install Dependencies
```bash
# In the server folder
cd server
npm install

# In the client folder
cd ../client
npm install
```

### 2. Seed the Database
```bash
cd server
npm run seed
```

### 3. Run Backend Integration Tests
```bash
cd server
npm test
```

### 4. Start the Application
In terminal 1 (Backend API on `http://localhost:5001`):
```bash
cd server
npm start
```

In terminal 2 (Frontend Client on `http://localhost:3000`):
```bash
cd client
npm run dev
```

Open `http://localhost:3000` in your web browser and log in with any demo credentials!
