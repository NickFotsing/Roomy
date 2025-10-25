Roomy API – Postman Endpoints Guide
This document lists all existing API endpoints, their inputs, auth requirements, and sample requests tailored for Postman testing.

Base Setup
Base URL: set a Postman variable {{baseUrl}} (e.g., http://localhost:3000)
Auth header: set {{accessToken}} in Postman after login/registration
Header: Authorization: Bearer {{accessToken}}
Content-Type: application/json for all POST/PATCH requests
Common variables you may define: {{groupId}}, {{billId}}, {{proposalId}}, {{transactionId}}, {{userId}}
Response Format
Success: { success: true, data: <any>, message?: string }
Error: { success: false, error: string }
Validation errors: { success: false, error: 'Validation failed', details: { field: [messages...] } }
Health
GET {{baseUrl}}/health
No auth
Returns { status: 'ok', environment, timestamp }
Authentication (/api/auth)
All request bodies are JSON.

POST {{baseUrl}}/api/auth/register
Body: { email, username, password, firstName?, lastName? }
Returns: { user, accessToken, refreshToken }
Sample body:
POST {{baseUrl}}/api/auth/login
Body: { emailOrUsername, password }
Returns: { user, accessToken, refreshToken }
Sample body:
POST {{baseUrl}}/api/auth/refresh
Body: { refreshToken }
Returns: { accessToken } (and may include refreshToken depending on service)
Sample body:
POST {{baseUrl}}/api/auth/logout
Body: { refreshToken }
Revokes refresh token; returns success
Sample body:
POST {{baseUrl}}/api/auth/logout-all

Auth required
Logs out from all devices for the current user
Sample: no body (Authorization header required)
POST {{baseUrl}}/api/auth/forgot-password

Body: { email }
In development, may return { resetToken }
Sample body:
POST {{baseUrl}}/api/auth/reset-password
Body: { token, newPassword }
Sample body:
POST {{baseUrl}}/api/auth/change-password
Auth required
Body: { currentPassword, newPassword }
Sample body:
GET {{baseUrl}}/api/auth/me
Auth required
Returns: { user, wallet }
Users (/api/users)
All endpoints require auth.

GET {{baseUrl}}/api/users/profile

Note: currently returns the user’s groups (wired to getUserGroups). Use /api/auth/me for profile.
Sample: no body
PUT {{baseUrl}}/api/users/profile

Body: { firstName?, lastName?, phoneNumber?, avatarUrl? }
Sample body:
DELETE {{baseUrl}}/api/users/account

Deletes current user account
Sample: no body
GET {{baseUrl}}/api/users/{{userId}}

Get a user by ID
Sample: no body
GET {{baseUrl}}/api/users/groups

Returns current user’s groups
Sample: no body
GET {{baseUrl}}/api/users/wallet

Returns current user’s wallet
Sample: no body
GET {{baseUrl}}/api/users/notifications

Returns notifications for current user
Sample: no body
PUT {{baseUrl}}/api/users/notifications/{{notificationId}}/read

Marks a notification as read
Sample: no body
PUT {{baseUrl}}/api/users/notifications/read-all

Marks all notifications as read
Sample: no body
Groups (/api/groups)
All endpoints require auth.

POST {{baseUrl}}/api/groups
Body: { name, votingThreshold?, memberEmails?: string[], smartAccountAddress? }
Sample body:
GET {{baseUrl}}/api/groups

Returns current user’s groups
Sample: no body
GET {{baseUrl}}/api/groups/{{groupId}}

Requires group membership
Returns group details
Sample: no body
POST {{baseUrl}}/api/groups/{{groupId}}/invite

Requires ADMIN role in group
Body: { emails: string[] }
Sample body:
POST {{baseUrl}}/api/groups/{{groupId}}/join
Body: { token } (invite token)
Sample body:
PUT {{baseUrl}}/api/groups/{{groupId}}
Requires ADMIN role (placeholder route)
Sample body (example placeholder):
DELETE {{baseUrl}}/api/groups/{{groupId}}

Requires ADMIN role (placeholder route)
Sample: no body
GET {{baseUrl}}/api/groups/{{groupId}}/members

Requires group membership (placeholder route)
Sample: no body
POST {{baseUrl}}/api/groups/{{groupId}}/members

Requires ADMIN role (placeholder route)
Sample body (example placeholder):
PUT {{baseUrl}}/api/groups/{{groupId}}/members/{{memberId}}
Requires ADMIN role (placeholder route)
Sample body (example placeholder):
DELETE {{baseUrl}}/api/groups/{{groupId}}/members/{{memberId}}

Requires ADMIN role (placeholder route)
Sample: no body
GET {{baseUrl}}/api/groups/{{groupId}}/bills

Requires group membership
Query: page?, limit?
Sample: no body
GET {{baseUrl}}/api/groups/{{groupId}}/transactions

Requires group membership
Query: page?, limit?
Sample: no body
GET {{baseUrl}}/api/groups/{{groupId}}/proposals

Requires group membership
Sample: no body
Bills (/api/bills)
All endpoints require auth.

POST {{baseUrl}}/api/bills
Body: { groupId, title, description?, totalAmount, currency?, dueDate?, payeeAddress, categoryId?, attachmentUrl?, items?: [{ description, amount, quantity? }] }
Requires membership in the specified groupId
Sample body:
GET {{baseUrl}}/api/bills

Query: page?, limit?
Returns user’s bills across their groups
Sample: no body
GET {{baseUrl}}/api/bills/{{billId}}

Returns a bill by ID
Sample: no body
PATCH {{baseUrl}}/api/bills/{{billId}}

Body: any updatable bill fields (same shape as create; all optional)
Sample body (minimal update):
DELETE {{baseUrl}}/api/bills/{{billId}}

Deletes the bill
Sample: no body
GET {{baseUrl}}/api/bills/{{billId}}/transactions

Placeholder route returns success message
Sample: no body
Proposals (/api/proposals)
All endpoints require auth.

POST {{baseUrl}}/api/proposals
Body: { billId, title, description?, votingDeadline }
Creates proposal from a DRAFT bill; requires membership of bill’s group
Sample body:
GET {{baseUrl}}/api/proposals/groups/{{groupId}}

Requires group membership
Returns proposals for the group
Sample: no body
GET {{baseUrl}}/api/proposals/{{proposalId}}

Returns proposal by ID (including votes)
Sample: no body
POST {{baseUrl}}/api/proposals/{{proposalId}}/votes

Body: { voteType: "FOR"|"AGAINST"|"ABSTAIN", comment? }
Records a vote; prevents duplicate votes per user
Sample body:
POST {{baseUrl}}/api/proposals/{{proposalId}}/execute
Executes an approved proposal (marks executed)
Sample: no body
Transactions (/api/transactions)
All endpoints require auth.

POST {{baseUrl}}/api/transactions
Body: { billId?, groupId?, receiverId?, amount, currency?, description?, type: "BILL_PAYMENT"|"DEPOSIT"|"WITHDRAWAL"|"REFUND"|"TRANSFER", toAddress?, metadata? }
If only billId provided, backend resolves groupId from bill
Records sender as current user; sets status PENDING
Integrates with Openfort for blockchain transactions
Sample body:
GET {{baseUrl}}/api/transactions/{{transactionId}}
Returns transaction by ID
Sample: no body
Response:
{
  "success": true,
  "data": {
    "transaction": {
      "id": "uuid",
      "amount": 25.50,
      "currency": "USDC",
      "status": "PENDING",
      "type": "BILL_PAYMENT",
      "description": "Payment for groceries",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}

GET {{baseUrl}}/api/transactions/intent/{{intentId}}/status
Get Openfort transaction intent status for blockchain monitoring
Sample: no body
Response:
{
  "success": true,
  "data": {
    "intent": {
      "id": "intent_abc123",
      "status": "pending|completed|failed",
      "transactionHash": "0x...",
      "chainId": 80002,
      "to": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
      "value": "25500000",
      "playerId": "player_xyz789"
    }
  }
}
Testing Tips (Postman)
Create a Postman environment with variables: baseUrl, accessToken, groupId, billId, proposalId, transactionId.
After registering/logging in, set accessToken from response to use in protected requests.
Use page and limit when listing bills and transactions for pagination.
For group-restricted routes, ensure the test user is a member of the group.