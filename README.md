# ExpiryWatch: Document Expiry and Renewal Tracker

**ExpiryWatch** is a centralised, cloud-hosted web application designed to help small organisations and individuals track time-sensitive documents—such as warranties, insurance policies, licences, certificates, and vendor contracts—and prevent missed renewals through automated reminders.

---

## Team & Project Details

* **Course:** Cloud Computing
* **Lab:** L402
* **Faculty Advisor:** Ishani Rana
* **Team Members:**
  * **Parth Deshmukh** (`1024031045`) — `pdeshmukh_be24@thapar.edu`
  * **Sanchit Narula** (`1024031048`) — `snarula_be24@thapar.edu`
  * **Madhav Mahajan** (`1024031003`) — `mmahajan_be24@thapar.edu`

---

## Core Features

1. **Centralised Cloud Document Vault:** Upload scanned copies or PDF versions of documents directly to durable cloud object storage.
2. **Metadata Tagging & Urgency Dashboard:** Tag documents by category, department, owner, and expiry date, and view upcoming renewals automatically sorted by urgency (`Expired`, `Critical < 7 days`, `Upcoming < 30 days`, `Safe`).
3. **Role-Based Access Control (RBAC):**
   * **Department Staff / Department Heads:** View, upload, and renew records belonging exclusively to their assigned department.
   * **Administrators:** Full visibility and management across all organisational departments.
4. **Automated Scheduled Reminders:** A serverless cron job runs daily to scan for documents approaching expiry and dispatches automated email alerts to document owners.
5. **Renewal History Log:** Maintains an auditable log of every renewal event, preserving historical expiry dates and renewal notes over time.

---

## System Architecture

ExpiryWatch decouples heavy file storage, relational metadata, authentication, background scheduling, and notification delivery using managed cloud services:

```text
+--------+       +-----------------+       +-----------------------+
|  User  | ----> | Web Application | ----> | Cloud Object Storage  |
+--------+       +-----------------+       | (PDFs & Scanned Docs) |
    ^               |     |                +-----------------------+
    |               |     |
    |               |     v                +-----------------------+
    |               |   +---------------+  | Identity & Access     |
    |               |   |   Database    |<-| Management (RBAC)     |
    |               |   | (Metadata &   |  +-----------------------+
    |               |   | Renewal Logs) |
    |               |   +---------------+
    |               |           ^
    |               v           |          +-----------------------+
    |            +------------------+      | Scheduled Cloud Job   |
    +------------|   Notification   |<-----| (Daily Cron Function) |
  Email Alert    |     Service      |      +-----------------------+
                 +------------------+
```

---

## Cloud & Tech Stack (100% Free Tier)

### Primary Recommended Stack (Zero-Cost Student Cloud Stack)
Designed for rapid team development without credit-card billing risks while maintaining clean cloud service separation:

| Layer | Technology / Cloud Service | Free Tier Allowance & Purpose |
| :--- | :--- | :--- |
| **Frontend & API** | **Next.js (React) + Tailwind CSS** | Full-stack web UI, urgency dashboard, and server API routes. |
| **Web Hosting** | **Vercel** | Free CI/CD deployments directly from GitHub (`100 GB` bandwidth/mo). |
| **Database** | **Supabase (PostgreSQL)** | `500 MB` managed Postgres database for metadata, roles, and renewal logs. |
| **Cloud Object Storage** | **Supabase Storage** | `1 GB` S3-compatible bucket storage for uploaded PDFs and scans. |
| **Identity & Access (IAM)** | **Supabase Auth + Row-Level Security (RLS)** | JWT authentication and database-level RBAC policies per department. |
| **Scheduled Cloud Function** | **Supabase Edge Functions + `pg_cron`** *(or Vercel Cron)* | Serverless daily background job (`500,000` invocations/mo free). |
| **Notification Service** | **Resend API** | Transactional email reminders (`3,000` emails/mo free). |

### Alternative Cloud-Native Mapping (AWS Free Tier)
If deploying on Amazon Web Services to mirror traditional enterprise cloud infrastructure:
* **Object Storage:** Amazon S3 (`5 GB` free for 12 months)
* **Database:** Amazon DynamoDB (`25 GB` always free)
* **Identity & Access Management:** Amazon Cognito (`50,000` MAUs free)
* **Scheduled Compute:** Amazon EventBridge Scheduler + AWS Lambda (`1M` requests/mo always free)
* **Notifications:** Amazon SES (Simple Email Service)

---

## Database Schema Overview

1. **`profiles`**
   * `id` (UUID, references `auth.users`)
   * `full_name` (Text)
   * `email` (Text)
   * `role` (Enum: `'admin'`, `'dept_head'`, `'staff'`)
   * `department` (Text, e.g., `'HR'`, `'IT'`, `'Finance'`, `'Operations'`)

2. **`documents`**
   * `id` (UUID, Primary Key)
   * `title` (Text)
   * `category` (Text: `'Insurance'`, `'Warranty'`, `'Licence'`, `'Contract'`, `'Certificate'`)
   * `department` (Text)
   * `owner_id` (UUID, references `profiles.id`)
   * `file_path` (Text, object storage key)
   * `expiry_date` (Date)
   * `reminder_days_before` (Integer, default `7`)
   * `last_notified_at` (Timestamp, nullable — prevents duplicate daily alerts)
   * `created_at` (Timestamp)

3. **`renewal_logs`**
   * `id` (UUID, Primary Key)
   * `document_id` (UUID, references `documents.id`)
   * `renewed_by` (UUID, references `profiles.id`)
   * `previous_expiry_date` (Date)
   * `new_expiry_date` (Date)
   * `notes` (Text)
   * `renewed_at` (Timestamp)

---

## Project Folder Structure

```text
expirywatch/
├── src/
│   ├── app/
│   │   ├── login/page.tsx              # [Member 1] Auth login screen
│   │   ├── dashboard/page.tsx          # [Member 1] Urgency dashboard (Red/Yellow/Green)
│   │   ├── api/
│   │   │   └── cron/check-expiry/
│   │   │       └── route.ts            # [Member 3] Daily scheduled email trigger
│   │   └── layout.tsx
│   ├── components/                     # [Member 1] UploadModal, RenewalModal, StatusBadge
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # [Member 2] Browser Supabase client
│   │   │   └── server.ts               # [Member 2] Server Supabase client
│   │   └── resend.ts                   # [Member 3] Email client setup
│   └── types/
│       └── database.ts                 # Shared TypeScript interfaces
├── .env.local                          # API keys (never commit to Git)
├── vercel.json                         # [Member 3] Daily cron schedule config
└── README.md
```

---

## Local Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/<your-org-or-username>/expirywatch.git
cd expirywatch
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in your free-tier cloud keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key
CRON_SECRET=your_random_secret_token
```

### 3. Run Database Migrations
Execute the SQL scripts inside `supabase/migrations/` in your Supabase SQL Editor to create the tables, storage bucket (`documents`), and department-level Row-Level Security policies.

### 4. Start the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Team Work Allocation

* **Member 1 (Frontend & UX):** Login UI, Urgency Dashboard with color-coded countdown badges, Document Upload form, and Renewal History modal.
* **Member 2 (Backend, Auth & Storage):** PostgreSQL schema, Supabase Storage bucket integration, and Role-Based Access Control (Admin vs. Department Head).
* **Member 3 (Cloud Automation & Notifications):** Daily scheduled cloud job, expiry threshold query logic, duplicate-alert prevention, and Resend email templates.
