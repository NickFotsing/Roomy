# Roomy – Full-Stack Guide (Frontend Features + Backend Contracts)

A comprehensive, production-ready overview of the Roomy application: features, data needs, and backend responsibilities required to make the entire frontend fully functional. This consolidates and supersedes prior docs (FEATURES.md, BACKEND_INTEGRATION.md, GROUPS_OPENFORT_README.md, QUICK_START.md, SETUP.md) with a single authoritative reference.

## 1) Project Overview
- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- UI: Radix UI + shadcn/ui
- State: Zustand (`lib/store.ts`)
- API layer: `lib/api.ts` (JSON envelope `ApiResponse`)
- Blockchain: Openfort SDK (client) + Polygon Amoy (80002)
- Mock data: `lib/mock-data.ts` used until backend connects
- Env: `NEXT_PUBLIC_API_URL` base for backend REST API

## 2) App Routes & Features
- `/`: Landing + auth dialog (login/register)
- `/dashboard`: Overview – balance, proposals, members, stats
- `/dashboard/groups`: Groups list + create group dialog
- `/dashboard/bills`: Bills list, details, status filters
- `/dashboard/transactions`: Transactions history (blockchain)
- `/dashboard/budget`: Categories, limits, progress
- `/dashboard/recurring`: Recurring bills (schedules, next due)
- `/dashboard/profile`: User profile, wallet, security
- `/dashboard/notifications`: Notification center

## 3) Frontend Architecture
- Centralized store: `lib/store.ts` defines entities and state slices (Groups, Bills, Proposals/Votes, Transactions, BudgetCategories, RecurringBills, Notifications, User, Wallet).
- API service: `lib/api.ts` centralizes HTTP calls, with `fetchApi` and `fetchWithAuth` that return an `ApiResponse<T>` envelope. `fetchWithAuth` handles token refresh on 401.
- Components and pages consume store and API services. `CreateGroupDialog` currently integrates `groupsApi.create` and maps backend response into store shape.

## 4) API Envelope Contract
All backend responses should follow:
```json
{
  "success": true,
  "message": "optional message",
  "data": { ... },
  "error": "optional error",
  "errors": { "field": ["validation message"] }
}
```
- On error, set `success: false` and populate `error` or `errors`.
- Frontend expects `data` consistently when `success: true`.

## 5) Authentication & Session
Endpoints required (unauth unless noted):
- `POST /auth/register` → `{ email, username, password, firstName?, lastName?, phoneNumber? }` → `AuthData { user, accessToken, refreshToken, wallet? }`
- `POST /auth/login` → `{ emailOrUsername, password }` → `AuthData`
- `POST /auth/refresh` → `{ refreshToken }` → `{ accessToken }`
- `POST /auth/logout` → `{ refreshToken }` → void
- `POST /auth/logout-all` (auth) → void
- `POST /auth/change-password` (auth) → `{ currentPassword, newPassword }` → void
- `GET /auth/me` (auth) → `{ user, wallet? }`
- `POST /auth/session` (auth) → `{ user, wallet }` (server-driven session init)
Notes:
- Frontend stores `auth_token` and `refresh_token` in localStorage.
- `fetchWithAuth` auto-retries after `POST /auth/refresh` on 401.

## 6) Groups
Frontend needs:
- `POST /groups` (auth) → Create. Payload options:
  - Client-provided address model: `{ name, description?, smartAccountAddress }`
  - Server-owned model: `{ name, description? }` and backend assigns address
- `GET /groups` (auth) → List groups for current user
- `GET /groups/:id` (auth) → Group details (include `balance`)
- Optional: `GET /groups/:id/members` (auth) → `GroupMember[]`
- Optional: `POST /groups/:id/members` (auth/admin) → add member
- Optional: `PATCH /groups/:id` (auth/admin) → update name/desc/threshold
- Optional: `DELETE /groups/:id` (auth/admin)
Recommended group response minimal fields:
```json
{
  "id": "group-123",
  "name": "Apartment 4B",
  "description": "...",
  "smartAccountAddress": "0x...", // or walletAddress
  "createdAt": "2025-01-15T14:00:00Z",
  "updatedAt": "2025-10-24T10:00:00Z"
}
```
Mapping to store:
- Store expects `smartAccountAddress`, `isActive`, `votingThreshold`. If backend doesn’t provide `isActive` or `votingThreshold`, frontend defaults (`true`, `51`).

## 7) Group Members
- Shape used in store: `{ id, groupId, userId, role, joinedAt, isActive, user? }`
- Endpoints:
  - `GET /groups/:id/members` → `GroupMember[]`
  - `POST /groups/:id/members` → add member `{ userId, role }`
  - `PATCH /groups/:id/members/:memberId` → update role/status
  - `DELETE /groups/:id/members/:memberId`

## 8) Bills & Expenses
Store shape:
- `Bill { id, groupId, createdBy, title, description?, totalAmount, currency, dueDate?, payeeAddress, categoryId?, attachmentUrl?, status, createdAt, updatedAt, items? }`
Endpoints:
- `GET /groups/:id/bills` → `Bill[]`
- `GET /bills/:id` → `Bill`
- `POST /bills` → create bill (include `items[]` for line items)
- `PATCH /bills/:id` → update bill
- `DELETE /bills/:id`
Statuses expected in UI: `DRAFT`, `PROPOSED`, `APPROVED`, `PAID`, `CANCELLED`.

## 9) Proposals & Voting
Store shape:
- `Proposal { id, billId, groupId, createdBy, title, description?, status, votesFor, votesAgainst, votesAbstain, votingDeadline, executedAt?, createdAt, updatedAt }`
- `Vote { id, proposalId, userId, voteType: "FOR"|"AGAINST"|"ABSTAIN", comment?, votedAt }`
Endpoints:
- `POST /proposals` → create proposal for a bill
- `GET /groups/:id/proposals` → list proposals
- `GET /proposals/:id` → proposal details (+ votes)
- `POST /proposals/:id/votes` → cast vote `{ voteType, comment? }`
- `POST /proposals/:id/execute` → execute approved proposal (trigger payment)
- `PATCH /proposals/:id` → update (admin)

## 10) Transactions
Store shape:
- `Transaction { id, billId?, groupId?, senderId?, receiverId?, amount, currency, txHash?, status, type, description?, metadata?, createdAt, updatedAt }`
Endpoints:
- `GET /groups/:id/transactions` → `Transaction[]`
- `GET /transactions/:id`
- `POST /transactions` → record/payment intent result
Types: `deposit`, `withdrawal`, `payment` with statuses `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`.

## 11) Budget & Categories
Store shape:
- `BudgetCategory { id, groupId, name, color?, icon?, monthlyLimit?, isActive, createdAt }`
Endpoints:
- `GET /groups/:id/categories`
- `POST /categories` → create category
- `PATCH /categories/:id`
- `DELETE /categories/:id`
Optional backend aggregation for budget stats per group.

## 12) Recurring Bills
Store shape:
- `RecurringBill { id, groupId, title, description?, amount, currency, payeeAddress, frequency, startDate, nextDueDate, endDate?, isActive, autoPropose, categoryId?, createdAt, updatedAt }`
Endpoints:
- `GET /groups/:id/recurring`
- `POST /recurring` → create schedule
- `PATCH /recurring/:id` → pause/resume/update
- `DELETE /recurring/:id`
- Optional cron/worker to emit upcoming occurrences; with `autoPropose` create bills automatically.

## 13) Notifications
Store shape:
- `Notification { id, userId, type, title, message, metadata?, isRead, createdAt }`
Endpoints:
- `GET /notifications` (auth) → user notifications
- `POST /notifications/mark-read` → mark by id
- `POST /notifications/mark-all-read`
- `DELETE /notifications/:id`
Realtime: WebSocket/SSE to push events (proposals, votes, payments, budgets).

## 14) Wallet & Openfort Integration
Frontend:
- Initialize Openfort React Kit with `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY`.
- Obtain user wallet/smart account address client-side after login/connect.
Group address models (choose one):
- Client-provided: frontend sends `smartAccountAddress` during `POST /groups`.
- Server-owned: backend assigns and persists address on create.
Backend:
- Use `OPENFORT_API_SECRET_KEY` for server-to-server Player/session intent operations.
- Do not call `POST /v1/wallets` server-side for embedded wallets.
- Fetch balances via JSON-RPC (Polygon Amoy) from persisted address.

## 15) Environment Variables
Frontend:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_OPENFORT_PUBLISHABLE_KEY`
Backend:
- `OPENFORT_API_SECRET_KEY`, `OPENFORT_ENVIRONMENT`
- `AMOY_RPC_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Database and storage configs (Prisma, etc.)

## 16) Error Handling & Validation
- Use consistent `ApiResponse` envelope.
- Return 4xx with `success: false` and `errors` map on validation.
- Frontend displays toast notifications on failure (e.g., auth, create group).

## 17) Integration Checklist
- Auth endpoints implemented and returning `AuthData`.
- `groupsApi.create` returns group object with address.
- Group list/detail endpoints wired; balance available.
- Bills, proposals, votes, transactions endpoints implemented with statuses.
- Budget categories and recurring schedules available.
- Notifications and realtime channel (optional but recommended).
- Openfort client initialized; address handling confirmed.
- Env variables set in frontend and backend.

## 18) Known Mappings & Defaults
- Store `Group` expects `smartAccountAddress`, `isActive`, `votingThreshold`. If backend lacks these, frontend defaults to `smartAccountAddress` from response or client wallet, `isActive: true`, `votingThreshold: 51`.
- `lib/types.ts` includes an alternative `Group` shape (e.g., `walletAddress`, `balance`, `members`). Backend may return either; `CreateGroupDialog` maps into store.

## 19) Testing
- Verify auth: register, login, token storage, refresh, session.
- Create group: address is set, current group updates, navigation to dashboard.
- Lists populate from backend: groups, bills, proposals, transactions, categories, recurring, notifications.
- Voting flow: propose → vote → execute → transaction recorded.
- Wallet: address shown; balance computed from backend.
- Error scenarios: invalid payloads, unauthorized, network failures.

This README is the single source of truth for making Roomy fully functional end-to-end. Implement the endpoints and contracts above, then remove mock data as backend integration is completed.
