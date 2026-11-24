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

## Cloud & Tech Stack

### Primary Architecture & Services
Designed with a decoupled cloud architecture ensuring reliability, security, and seamless developer workflows:

| Layer | Technology / Cloud Service | Role & Functionality |
| :--- | :--- | :--- |
| **Frontend & API** | **Next.js (React) + Tailwind CSS** | Full-stack web application, urgency dashboard, and serverless API routes. |
| **Web Hosting & Edge** | **Vercel** | Edge deployment platform with automated CI/CD directly from GitHub. |
| **Database** | **Supabase (PostgreSQL)** | Managed PostgreSQL relational database for document metadata, RBAC profiles, and renewal audit logs. |
| **Cloud Object Storage** | **Supabase Storage** | S3-compatible cloud object storage for uploaded PDFs and scanned documents. |
| **Identity & Access (IAM)** | **Supabase Auth + Row-Level Security (RLS)** | JWT authentication and database-level RBAC policies enforced per department. |
| **Scheduled Compute** | **Vercel Cron / Supabase Edge Functions** | Serverless daily background task to scan document expiries and trigger alerts. |
| **Notification Service** | **Resend API** | Transactional email delivery service for automated renewal reminder alerts. |

### Enterprise Cloud Architecture Mapping (AWS)
For enterprise deployments on Amazon Web Services:
* **Object Storage:** Amazon S3
* **Database:** Amazon Aurora PostgreSQL / DynamoDB
* **Identity & Access Management:** Amazon Cognito
* **Scheduled Compute:** Amazon EventBridge Scheduler + AWS Lambda
* **Notifications:** Amazon Simple Email Service (SES)

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

## Member 1 implementation

The Member 1 frontend slice is implemented in this repository:

* `/login` provides an accessible sign-in form and client-side navigation into the workspace. It is intentionally ready for Supabase Auth wiring, but does not claim to authenticate until Member 2 connects the client.
* `/dashboard` provides the Red / Orange / Yellow / Green urgency overview, searchable and filterable document table, expiry calculations, and responsive layout.
* `src/components/UploadModal.tsx` adds document metadata and a local file selection boundary until Supabase Storage is connected.
* `src/components/RenewalModal.tsx` updates the local expiry state and captures renewal notes for the future `renewal_logs` integration.
* `src/components/StatusBadge.tsx` centralises the four README-defined urgency states.

The current UI uses typed demo records so it can be run and reviewed without cloud credentials. It does not upload files, authenticate users, persist records, or send email until the Member 2 and Member 3 Supabase/Resend work is connected.

### Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login` to review the Member 1 flow. Production verification uses `npm run build`.
