# Smart Resource Allocation System

A full-stack **Smart Resource Allocation System** for managing organizational resources, booking requests, approvals, allocations, priorities, conflicts, departments, members, trends, and reports.

## 🚀 Live Demo

**Production website:** https://smart-resource-allocation-system-production-57fb.up.railway.app

The application is deployed on **Railway** with an Express backend and MySQL database using Railway private networking.

## 🎯 Project Overview

Organizations often manage rooms, vehicles, equipment, meeting spaces, and other shared resources through manual processes. This can lead to double-booking, conflicts, poor utilization, delayed approvals, and difficulty tracking requests.

This system provides a centralized web application that helps organizations:
- Manage shared resources
- Submit and review resource requests
- Approve and allocate resources
- Detect scheduling conflicts
- Prioritize requests
- Track resource utilization
- Manage members and departments
- Generate reports and view strategic trends

## ✨ Key Features

- Organization-based member login and role/access-level authorization
- Dashboard with resource and request statistics
- Resource list, search, filters, details, add/edit, and deactivation
- Resource booking requests and priority explanations
- Conflict detection for overlapping resource usage
- Request approval and allocation management
- Resource proposals
- Department and member management
- Priority management
- Strategic trends and utilization insights
- Reports
- Resource Calendar
- Approval Center
- Maintenance and resource lifecycle tracking
- Notifications and activity/audit trail
- Conflict intelligence with risk scores, suggested actions, and alternatives
- Member and department history / 360-degree intelligence
- Resource image upload and bundled fallback images

## 👥 User Roles

| Role | Purpose |
|---|---|
| Employee | View resources and submit resource requests |
| Manager | Review and make request decisions |
| Resource Manager | Manage organizational resources and allocations |

## 🛠️ Technology Stack

**Frontend:** HTML5, CSS3, Vanilla JavaScript  
**Backend:** Node.js, Express.js, REST APIs  
**Database:** MySQL  
**Deployment:** Railway, Railway Private Networking  
**Development:** VS Code, GitHub, npm

## 🏗️ System Architecture

```
User / Browser
      |
      v
Frontend (HTML + CSS + JavaScript)
      |
      v
Express.js REST API
      |
      v
Business Logic / Services
      |
      v
MySQL Database
      |
      v
Railway Private Network
```

The production backend communicates with MySQL through Railway's private network rather than exposing the database publicly.

## 📂 Project Structure

```
Smart-Resource-Allocation-System/
├── client/
│   ├── public/          # Active frontend
│   └── src/             # React-style scaffold
├── server/
│   ├── controllers/     # API handlers and database queries
│   ├── routes/          # API route registration
│   ├── services/        # Allocation, priority, conflict, image and utilization logic
│   ├── scripts/         # Dataset import scripts
│   ├── data/            # Dataset files
│   └── server.js        # Express server
├── database/            # SQL schema and seed references
├── .env.example         # Environment variable template
├── DATASET_SETUP.md     # Database setup instructions
├── DEMO_WALKTHROUGH.md  # Suggested demonstration flow
└── README.md
```

## 🗄️ Database

The system uses MySQL with an organization-scoped demonstration dataset. The production demo was expanded with rich workflow data so the major screens are populated during demonstrations.

The production demo expansion targets:
- **12+ departments**
- **16+ members**
- **18+ resources**
- **50+ resource requests**
- **12 conflicts**
- **14+ allocations**
- **12 maintenance tickets**
- **40 audit events**
- **18 notifications**

The idempotent demo expansion script is:

```powershell
npm.cmd run seed:expansion
```

The full dataset setup command is:

```powershell
npm.cmd run seed:dataset
```

> **Important:** `seed:dataset` is intended for a fresh database. Do not repeatedly run the full dataset import against an existing production database. The `seed:expansion` script is designed to be idempotent for the demo organization.

## 🔐 Demo Login

The seeded demo password is:

```
password
```

| Organization ID | Member ID | Role |
|---|---|---|
| `ABC-TECH-001` | `EMP1001` | Employee |
| `ABC-TECH-001` | `EMP1002` | Manager |
| `NORTH-SCHOOL-001` | `SCL5001` | Resource Manager |
| `CIVIC-GOV-001` | `GOV6001` | Resource Manager |
| `COMMUNITY-OTHER-001` | `OTH7001` | Resource Manager |

**Recommended Manager demo:** `ABC-TECH-001 / EMP1002 / password`

## 💻 Run Locally

### Requirements
- Node.js
- MySQL
- A MySQL database accessible by the configured user

### Install dependencies

```powershell
npm.cmd install
```

### Start the application

```powershell
npm.cmd start
```

Then open:

http://localhost:5001

### Fresh database setup

1. Copy `.env.example` to `.env`.
2. Configure the MySQL connection.
3. Start the application once so required tables/reference rows are created.
4. Stop the server.
5. Import the dataset:

```powershell
npm.cmd run seed:dataset
```

6. Restart the application.

For detailed setup and seed-safety notes, see [DATASET_SETUP.md](DATASET_SETUP.md).

## 🧪 Testing

Run the test suite with:

```powershell
npm.cmd test
```

Tests cover resource validation, resource-management permissions, and dataset relationship integrity.

## 📊 Main Modules

1. Dashboard
2. Resources
3. Resource Requests
4. Allocations
5. Conflicts
6. Members
7. Departments
8. Priorities
9. Strategic Trends
10. Reports
11. Resource Calendar
12. Approval Center
13. Maintenance
14. Activity & Audit
15. Notifications

### Conflict Intelligence

The conflict module goes beyond showing a basic conflict flag. Managers can review:
- Risk scores
- Conflict severity and status
- Suggested resolution actions
- Alternative resources
- Reassignment/resolution actions

### Entity History

Decision-authority users can open deeper history for:
- **Members:** requests, allocations, conflicts, maintenance activity, and audit events
- **Departments:** members, resources, requests, allocations, conflicts, and maintenance activity

## 🚀 Deployment

The production version is deployed on Railway.

```
GitHub Repository
       |
       v
Railway Application Service
       |
       +------> Express / Node.js Backend
       |
       +------> Railway Private Network
                       |
                       v
                    MySQL
```

The production database is not publicly exposed. The backend uses Railway's private MySQL hostname for database communication.

## 📚 Documentation

- [Dataset Setup](DATASET_SETUP.md)
- [Demo Walkthrough](DEMO_WALKTHROUGH.md)
- [Demo Organization Data](DEMO_ORGANIZATION_DATA.txt)

## 🔮 Future Scope

- Email and notification integration
- Advanced analytics and forecasting
- Calendar integration
- Mobile application
- SSO/OAuth authentication
- Fine-grained permission management
- Automated utilization recommendations
- Cloud-based file and image storage

## 📌 Project Status

**Production demo deployed on Railway with an expanded demonstration dataset.**

The current production build includes the full-stack application, MySQL integration, authentication and role-based access, resource/request workflows, allocations, conflict intelligence, calendar and approval workflows, maintenance tracking, notifications, audit history, member/department intelligence, and reporting.

The `main` branch is protected with a GitHub ruleset requiring pull requests and one approval before merging, while blocking force pushes and branch deletion.
