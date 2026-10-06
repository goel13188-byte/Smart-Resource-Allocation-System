# Smart Resource Allocation

A MySQL-backed resource allocation application with a Vanilla JavaScript frontend served from `client/public` and an Express API in `server`. `client/src` contains an incomplete React-style scaffold; it is not the frontend served by the current server.

## Features

- Organization-based member login and role/access-level authorization
- Dashboard summary, recent requests, and conflicts
- Organization-scoped resource list, details, search, filters, add/edit, and deactivation
- Resource booking requests, priority explanations, and conflict detection
- Approvals, allocations, resource proposals, departments, members, priorities, trends, and reports
- Resource image upload, bundled category fallbacks, and shared icon assets

## Requirements

- Node.js
- MySQL
- A local `.env` file with a database that the configured MySQL user can access

## Run the current workspace demo

The current demo setup uses port `5001` and an isolated MySQL database named `smart_resource_allocation_demo`. Start the app with:

```powershell
npm.cmd start
```

Then open [http://localhost:5001](http://localhost:5001).

The local `.env` is ignored by Git and contains machine-specific database settings. Do not replace it with `.env.example` unless you have checked which database it targets. Do not seed an already populated database; the dataset importer intentionally stops when organizations already exist.

## Set up a fresh database

1. Copy `.env.example` to `.env` and set a valid local MySQL user/password and an empty database name. Keep `.env` out of source control.
2. Install dependencies and start once to create missing tables and reference rows:

   ```powershell
   npm.cmd install
   npm.cmd start
   ```

3. Stop the server, then import the sample records into that empty database:

   ```powershell
   npm.cmd run seed:dataset
   ```

4. Restart the server:

   ```powershell
   npm.cmd start
   ```

For the complete setup and seed safety notes, see [DATASET_SETUP.md](DATASET_SETUP.md).

## Demo Login

The seeded member password is `password`. Enter the organization code, member ID, and password.

| Organization | Member ID | Account role |
|---|---|---|
| `ABC-TECH-001` | `EMP1001` | Employee, read-only resources |
| `ABC-TECH-001` | `EMP1002` | Manager, request decisions |
| `NORTH-SCHOOL-001` | `SCL5001` | Resource Manager |
| `CIVIC-GOV-001` | `GOV6001` | Resource Manager |
| `COMMUNITY-OTHER-001` | `OTH7001` | Resource Manager |

Seven organizations and their member/resource details are listed in [DEMO_ORGANIZATION_DATA.txt](DEMO_ORGANIZATION_DATA.txt). A suggested presentation sequence is in [DEMO_WALKTHROUGH.md](DEMO_WALKTHROUGH.md).

## Commands

```powershell
npm.cmd start
npm.cmd run dev
npm.cmd test
npm.cmd run seed:dataset
npm.cmd run seed:demo
```

`seed:dataset` is only for a fresh empty database. `seed:demo` creates/upserts the separate `DEMO-COMPANY` and `DEMO-SCHOOL` demonstration organizations and is not required for the seven-organization dataset.

## Project Layout

- `client/public/`: active HTML, CSS, and browser JavaScript
- `client/src/assets/`: bundled image and icon files, served at `/images` and `/icons`
- `server/routes/`: API route registration
- `server/controllers/`: API handlers and MySQL queries
- `server/services/`: allocation, priority, conflict, image, and utilization logic
- `database/`: SQL schema and seed references
- `server/data/dataset.json`: sample organization and workflow records

## Tests

Run the Node test suite with `npm.cmd test`. Tests cover resource field preservation/validation, resource-management permissions, and dataset relationship integrity.
