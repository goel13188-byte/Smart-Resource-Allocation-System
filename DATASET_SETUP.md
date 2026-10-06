# Loading the supplied sample dataset

The application uses its own MySQL schema, whose column names differ from the schema in the supplied SQL text. The supplied demo records are included as `server/data/dataset.json`; `server/scripts/seedDataset.js` maps them into the application's existing tables. The original `DROP DATABASE` statement is deliberately not included or run.

## Setup

### Current workspace demo

This workspace has already been seeded into the isolated database `smart_resource_allocation_demo`. The existing `smart_resource_allocation` database was left unchanged. Local database credentials are machine-specific and belong in the ignored `.env`. Start the server with `npm.cmd start`; do not rerun the dataset importer against this populated demo database.

1. Install Node.js and MySQL, then create an empty MySQL database (the default name is `smart_resource_allocation`).
2. In the project root, copy `.env.example` to `.env` and set your local MySQL credentials:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Install dependencies and create the application tables:

   ```powershell
   npm.cmd install
   npm.cmd start
   ```

   Stop the server after it reports that the database connection is ready; startup creates missing tables and reference data.

4. Import the included sample dataset:

   ```powershell
   npm.cmd run seed:dataset
   ```

5. Start the server again with `npm.cmd start`, then open `http://localhost:5001` (or the port configured in `.env`).

## Demo accounts

The sample password is `password` for all imported members. The importer creates a bcrypt hash for that password. Use an organization code and member ID below:

| Organization code | Member ID | Example account |
|---|---|---|
| `ABC-TECH-001` | `EMP1001` | Company employee |
| `SRM-DEMO-001` | `FAC2001` | College faculty |
| `CITY-HOSP-001` | `DOC3001` | Hospital doctor |
| `GREEN-NGO-001` | `EMP4001` | NGO coordinator |
| `NORTH-SCHOOL-001` | `SCL5001` | School Resource Manager |
| `CIVIC-GOV-001` | `GOV6001` | Government Resource Manager |
| `COMMUNITY-OTHER-001` | `OTH7001` | Other-organization Resource Manager |

Each new organization also includes a regular member account. The full member, resource, request, and priority inventory is in `DEMO_ORGANIZATION_DATA.txt`.
For a step-by-step presentation sequence, see `DEMO_WALKTHROUGH.md`.

These are demo-only credentials. Change or remove them before exposing the app beyond a local development environment.

## Safety and re-running

The dataset includes 7 organization types, 7 organizations, 19 departments, 16 members, 17 resources, and 12 requests, with related availability, priorities, trends, and score factors. The importer **refuses to run if any organization already exists**; it will not replace project data. Use a fresh, empty application database for this sample dataset. Dataset loading is explicit and does not happen automatically when the application starts.
