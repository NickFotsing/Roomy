# Frontend API Integration Guide

This document outlines, in detail, the backend endpoints and data contracts implemented so far. Use this as the source of truth while wiring up the frontend.

## Base URL and Auth
- Base API: `http://<server>/api`
- Auth header: `Authorization: Bearer <accessToken>` (JWT)
- CORS: Server allows `origin` from `config.frontendUrl` with credentials

## Response Format
All endpoints return a standardized envelope:
- Success:
  ```json
  { "success": true, "message": "optional", "data": <payload> }
  ```
- Error:
  ```json
  { "success": false, "error": "message", "errors": { "field": ["msg"] } }
  ```
- Common status codes: `200`, `201`, `401`, `403`, `404`, `422`, `500`

## Access Control
- `authenticate` required for all routes below.
- `requireGroupMembership('groupId')` for group-scoped endpoints.
- Certain mutations (bill update/delete, proposal execute) may require creator/admin; server enforces.

---

## Bills
Routes are mounted at `/api/bills` and `/api/groups/:groupId/bills`.

### Create Bill
- Method/Path: `POST /api/bills`
- Access: Authenticated and member of the target group (`groupId` in body)
- Body:
  ```json
  {
    "groupId": "uuid",
    "title": "string",
    "description": "string?",
    "totalAmount": 123.45,
    "currency": "USDC|ETH|MATIC?", // default USDC
    "dueDate": "ISO8601?",
    "payeeAddress": "0x...", // EVM address
    "categoryId": "uuid?",
    "attachmentUrl": "url?",
    "items": [{ "description": "string", "amount": 10.5, "quantity": 1 }]? 
  }
  ```
- Validation highlights: `groupId` UUID, `title` 1–200 chars, `totalAmount` > 0, `payeeAddress` EVM address.
- Response `201`:
  - `data`: Bill object including items and basic relations.

### Get Current User Bills
- Method/Path: `GET /api/bills`
- Query: `page?` (int ≥1), `limit?` (1–100, default 20)
- Response `200`:
  ```json
  {
    "success": true,
    "data": {
      "bills": [ ... ],
      "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
    }
  }
  ```

### Get Group Bills
- Method/Path: `GET /api/groups/:groupId/bills`
- Access: Group membership
- Params: `groupId` UUID
- Query: `page?`, `limit?`
- Response `200`: same pagination envelope as above with `bills`.

### Get Bill By ID
- Method/Path: `GET /api/bills/:billId`
- Params: `billId` UUID
- Response `200`:
  - `data`: Bill with:
    - `items: BillItem[]`
    - `creator: { id, username, email }`
    - `category: { id, name, color }?`
    - `group: { id, name }`
    - `proposal` (if exists) with `votes` and basic voter info
    - `transactions` including `sender { id, username }`

### Update Bill
- Method/Path: `PATCH /api/bills/:billId`
- Access: Bill creator or group admin
- Body: Any subset of fields from Create (plus optional `status` among `DRAFT|PROPOSED|APPROVED|REJECTED|PAID|CANCELLED`). If `items` provided, server replaces all existing items.
- Response `200`: updated Bill with items and selected relations.

### Delete Bill
- Method/Path: `DELETE /api/bills/:billId`
- Access: Bill creator or group admin
- Response `200`: `data: null`, `message: "Bill deleted successfully"`

---

## Proposals
Routes are mounted at `/api/proposals` and `/api/groups/:groupId/proposals`.

### Create Proposal
- Method/Path: `POST /api/proposals`
- Access: Authenticated; must be a member of the bill's group
- Body:
  ```json
  {
    "billId": "uuid",
    "title": "string",
    "description": "string?",
    "votingDeadline": "ISO8601" // required
  }
  ```
- Behavior: Verifies bill exists; sets bill status to `PROPOSED`.
- Response `201`: Proposal object.

### Get Group Proposals
- Method/Path: `GET /api/groups/:groupId/proposals`
- Access: Group membership
- Params: `groupId` UUID
- Response `200`: array of proposals for the group.

### Get Proposal By ID
- Method/Path: `GET /api/proposals/:proposalId`
- Params: `proposalId` UUID
- Response `200`: proposal details with vote tallies.

### Vote on Proposal
- Method/Path: `POST /api/proposals/:proposalId/votes`
- Access: Group membership
- Body:
  ```json
  { "isApproved": true, "comment": "string?" }
  ```
- Behavior: Prevents double voting; may auto-approve if group `votingThreshold` met. Maps `isApproved=true` to FOR and `false` to AGAINST.
- Response `200`: updated proposal with tallies.

### Execute Proposal
- Method/Path: `POST /api/proposals/:proposalId/execute`
- Access: Creator or group admin
- Behavior: Marks proposal executed; in future may trigger on-chain flows.
- Response `200`: executed proposal.

---

## Transactions
Routes are mounted at `/api/transactions` and `/api/groups/:groupId/transactions`.

### Create Transaction
- Method/Path: `POST /api/transactions`
- Access: Authenticated; must be member of the relevant group
- Body:
  ```json
  {
    "billId": "uuid?",     // if provided, group resolves from bill
    "groupId": "uuid?",    // required if billId not provided
    "receiverId": "uuid?", // optional user receiver
    "amount": 120.5,
    "currency": "USDC|ETH|MATIC?", // default USDC
    "type": "BILL_PAYMENT|DEPOSIT|WITHDRAWAL|REFUND|TRANSFER",
    "description": "string?",
    "metadata": { "any": "json?" },
    "toAddress": "0x..." // optional EVM address to create Openfort intent
  }
  ```
- Behavior:
  - If `billId` present, backend loads bill and uses its `groupId`.
  - Validates active membership; records `senderId` as the authenticated user.
  - If `toAddress` provided, provisions wallet (if needed) and creates an Openfort transaction intent; returns intent ID within transaction metadata.
  - Stores `metadata` as a JSON string.
- Response `201`: Transaction object.

#### Examples
- Deposit to own wallet:
  ```bash
  curl -X POST $BASE/api/transactions \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{
      "groupId": "<group-uuid>",
      "amount": 100,
      "type": "DEPOSIT",
      "description": "Top-up"
    }'
  ```
- Transfer to address (creates Openfort intent):
  ```bash
  curl -X POST $BASE/api/transactions \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{
      "groupId": "<group-uuid>",
      "amount": 5,
      "currency": "ETH",
      "type": "TRANSFER",
      "toAddress": "0x0123456789abcdef0123456789abcdef01234567",
      "description": "Send to external wallet"
    }'
  ```

### Get Transaction By ID
- Method/Path: `GET /api/transactions/:transactionId`
- Params: `transactionId` UUID
- Response `200`: Transaction details.

### Get Group Transactions
- Method/Path: `GET /api/groups/:groupId/transactions`
- Access: Group membership
- Params: `groupId` UUID
- Query: `page?` (≥1), `limit?` (1–100, default 20)
- Response `200`:
  ```json
  {
    "success": true,
    "data": {
      "transactions": [ ... ],
      "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
    }
  }
  ```

---

## Budget Categories
Routes are mounted at `/api/categories` and `/api/groups/:groupId/categories`.

### Get Group Categories
- Method/Path: `GET /api/groups/:groupId/categories`
- Access: Group membership
- Params: `groupId` UUID
- Response `200`: Array of categories.

### Create Category
- Method/Path: `POST /api/categories`
- Access: Group admin
- Body:
  ```json
  {
    "groupId": "uuid",
    "name": "string",
    "color": "#RRGGBB?",
    "icon": "string?",
    "monthlyLimit": 500
  }
  ```
- Response `201`: Category object.

### Update Category
- Method/Path: `PATCH /api/categories/:categoryId`
- Access: Group admin
- Body: Any subset of fields from create, plus `isActive`.
- Response `200`: Updated category.

### Delete Category
- Method/Path: `DELETE /api/categories/:categoryId`
- Access: Group admin
- Response `204`: No content.

---

## Recurring Bills
Routes are mounted at `/api/recurring` and `/api/groups/:groupId/recurring`.

### Get Group Recurring Schedules
- Method/Path: `GET /api/groups/:groupId/recurring`
- Access: Group membership
- Params: `groupId` UUID
- Response `200`: Array of recurring schedules.

### Create Recurring Schedule
- Method/Path: `POST /api/recurring`
- Access: Group admin
- Body:
  ```json
  {
    "groupId": "uuid",
    "title": "string",
    "description": "string?",
    "amount": 100,
    "currency": "USDC",
    "payeeAddress": "0x...",
    "frequency": "MONTHLY",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": null,
    "autoPropose": true,
    "categoryId": "uuid?"
  }
  ```
- Response `201`: RecurringBill object.

### Update Recurring Schedule
- Method/Path: `PATCH /api/recurring/:recurringId`
- Access: Group admin
- Body: Any subset of fields from create, plus `nextDueDate`, `isActive`.
- Response `200`: Updated RecurringBill.

### Delete Recurring Schedule
- Method/Path: `DELETE /api/recurring/:recurringId`
- Access: Group admin
- Behavior: Soft-deactivates the schedule (`isActive=false`).
- Response `204`: No content.

### Process Due Recurring
- Method/Path: `POST /api/recurring/process`
- Access: Authenticated (admin ops); typically a cron triggers this.
- Behavior: Creates bills for schedules with `nextDueDate <= now`; if `autoPropose`, also creates proposals.
- Response `200`:
  ```json
  { "success": true, "data": { "processed": 3 } }
  ```

---

## Groups (selected)
Routes impacted/added under `/api/groups`:
- `GET /api/groups/:groupId` — group details (membership required)
- `POST /api/groups/:groupId/invite` — invites (admin only)
- `POST /api/groups/:groupId/join` — join via token
- `GET /api/groups/:groupId/bills` — group bills (with pagination)
- `GET /api/groups/:groupId/proposals` — group proposals
- `GET /api/groups/:groupId/transactions` — group transactions (with pagination)
- `GET /api/groups/:groupId/categories` — budget categories
- `GET /api/groups/:groupId/recurring` — recurring schedules

---

## Validation Rules Summary
- UUIDs: `groupId`, `billId`, `proposalId`, `transactionId`, `categoryId`, `receiverId`
- Currency: one of `USDC`, `ETH`, `MATIC`
- EVM address: `payeeAddress` must match `^0x[a-fA-F0-9]{40}$`
- Amounts: positive floats; quantities: positive integers
- Date strings: ISO 8601

## Integration Notes
- Always include the Bearer token header. Most endpoints return `401` if missing or invalid.
- Handle `422` for validation failures; use `errors` map to surface field-level messages.
- Paginated endpoints include `pagination` with `totalPages`; default `limit` is 20.
- Bill updates with `items` will replace all existing items.
- Transactions record `senderId`; `receiverId` is optional for transfers/refunds.

## Sample cURL
```bash
# Create a bill
curl -X POST $BASE/api/bills \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "groupId": "<group-uuid>",
    "title": "June Rent",
    "totalAmount": 1200,
    "payeeAddress": "0x0123456789abcdef0123456789abcdef01234567"
  }'

# Create a transaction (bill payment)
curl -X POST $BASE/api/transactions \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "billId": "<bill-uuid>",
    "amount": 400,
    "type": "BILL_PAYMENT",
    "description": "Alice share"
  }'

# Get group transactions (page 2)
curl -X GET "$BASE/api/groups/<group-uuid>/transactions?page=2&limit=25" \
  -H "Authorization: Bearer $TOKEN"
```