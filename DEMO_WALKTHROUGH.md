# Demo Walkthrough

This walkthrough uses the MySQL-backed sample dataset. All listed records come from the database after `server/data/dataset.json` has been imported; the frontend does not use mock resource/request arrays.

## Before the Demo

- Start the backend with `npm.cmd start`.
- Open [http://localhost:5001](http://localhost:5001), or use the port configured in local `.env`.
- Confirm MySQL accepts the credentials in `.env` and that the chosen database has already been seeded.
- Seed only a fresh, empty database. `npm.cmd run seed:dataset` refuses to run if organizations already exist.
- Demo member password: `password`.

## 1. Employee View

Login with:

- Organization: `ABC-TECH-001`
- Member: `EMP1001` (Rahul Sharma)
- Password: `password`

Show the dashboard summary and the Resources section. Rahul is an Employee with Member access: he can view/search resources and submit a resource-addition proposal, but resource-management controls are hidden. The server also rejects a direct resource create/update/delete request with `403`; hiding the controls is not the security boundary.

The ABC sample includes six resources. In the resource list, try searching for `GPU` or filtering by category/status, then open `EQ-001` to show its database-backed details.

## 2. Manager Decisions

Log out, then use:

- Organization: `ABC-TECH-001`
- Member: `EMP1002` (Priya Mehta)
- Password: `password`

Show the request list and approval controls. Seeded examples include:

- `Project Alpha`: Conference Room A, score 91, Recommended
- `Quarterly Finance Review`: Conference Room A, score 52, Conflict
- `AI Research Project`: AI GPU Workstation, score 94, Approved
- `Client Beta`: Projector A, score 83, Pending

Requests and conflicts use the saved seed values. A new request submission displays the ID, score, recommendation, and status returned by the backend. Request approval checks for allocation overlap; a successful approval creates an allocation. Rejections require a reason.

## 3. Resource Management

Log out and sign in with a dedicated Resource Manager account:

- Organization: `NORTH-SCHOOL-001`
- Member: `SCL5001` (Maya Nair)
- Password: `password`

Open Resources, view `SCL-CLS-001`, then use Add Resource or Edit to demonstrate resource management. The same role is available in the Government and Other sample organizations:

- `CIVIC-GOV-001 / GOV6001` (Aditi Rao)
- `COMMUNITY-OTHER-001 / OTH7001` (Noor Thomas)

Both use the same seeded password. Resource changes are authorized by role/access level on both the client and server. Proposals remain a separate review workflow for senior organization leaders.

## 4. Images and Responsive Layout

The resource table uses fixed 64 × 48 thumbnails and category-specific fallbacks. The resource detail view and upload preview use a 176 × 132 image frame. Bundled image files are served from `/images`; bundled UI icons are served from `/icons`.

For a desktop presentation, use a wide browser viewport (for example 1440 × 900). Tables scroll horizontally on narrow screens; the page itself should not overflow horizontally.

## 5. Other Seeded Organizations

The dataset includes one organization for each configured type. Additional example logins are listed in [DEMO_ORGANIZATION_DATA.txt](DEMO_ORGANIZATION_DATA.txt), including the College, Hospital, and NGO accounts. Each seeded member uses password `password`.

## 6. Finish

Use Logout to return to the login screen. The navigation includes Dashboard, Resources, Resource Requests, Allocations, Conflicts, Members, Departments, Priorities, Strategic Trends, Reports, and Logout. There is no Settings navigation option.
