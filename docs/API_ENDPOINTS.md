# Roomy API Endpoints Reference

A comprehensive reference guide for all available API endpoints in the Roomy application. This document is designed for frontend developers to easily integrate with the backend API.

## Base Configuration

- **Base URL**: `http://localhost:3000` (development) or your deployed backend URL
- **API Base Path**: `/api`
- **Authentication**: Bearer token in Authorization header
- **Content-Type**: `application/json` for all POST/PUT/PATCH requests

## Response Format

All API endpoints return a standardized response envelope:

### Success Response
```json
{
  "success": true,
  "message": "Optional success message",
  "data": { /* Response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errors": {
    "field": ["Validation error messages"]
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## 🔐 Authentication Endpoints

Base path: `/api/auth`

### Register User
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "securePassword123",
  "firstName": "John", // optional
  "lastName": "Doe"    // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Login User
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "emailOrUsername": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as register

### Refresh Token
- **Method**: `POST`
- **URL**: `/api/auth/refresh`
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token"
  }
}
```

### Get Current User
- **Method**: `GET`
- **URL**: `/api/auth/me`
- **Auth Required**: Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe"
    },
    "wallet": {
      "address": "0x...",
      "balance": "100.50"
    }
  }
}
```

### Logout
- **Method**: `POST`
- **URL**: `/api/auth/logout`
- **Auth Required**: Yes

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

### Logout All Devices
- **Method**: `POST`
- **URL**: `/api/auth/logout-all`
- **Auth Required**: Yes

### Change Password
- **Method**: `POST`
- **URL**: `/api/auth/change-password`
- **Auth Required**: Yes

**Request Body:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newSecurePassword123"
}
```

### Forgot Password
- **Method**: `POST`
- **URL**: `/api/auth/forgot-password`
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### Reset Password
- **Method**: `POST`
- **URL**: `/api/auth/reset-password`
- **Auth Required**: No

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

### Send Email Verification
- **Method**: `POST`
- **URL**: `/api/auth/send-verification`
- **Auth Required**: Yes

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

### Verify Email Token
- **Method**: `POST`
- **URL**: `/api/auth/verify-email`
- **Auth Required**: No

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Resend Email Verification
- **Method**: `POST`
- **URL**: `/api/auth/resend-verification`
- **Auth Required**: Yes

**Response:**
```json
{
  "success": true,
  "message": "Verification email resent successfully"
}
```

### Google OAuth Login
- **Method**: `GET`
- **URL**: `/api/auth/google`
- **Auth Required**: No

**Description**: Redirects to Google OAuth consent screen. After successful authentication, redirects to `/api/auth/google/callback`.

### Google OAuth Callback
- **Method**: `GET`
- **URL**: `/api/auth/google/callback`
- **Auth Required**: No

**Description**: Handles Google OAuth callback and redirects to frontend with JWT tokens. Email is automatically verified for Google users.
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "newSecurePassword123"
}
```

---

## 👤 User Endpoints

Base path: `/api/users`
**Auth Required**: Yes (all endpoints)

### Get User Profile
- **Method**: `GET`
- **URL**: `/api/users/profile`

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "createdAt": "2025-10-26T03:27:22.877Z",
    "updatedAt": "2025-10-27T18:36:54.789Z",
    "isEmailVerified": true,
    "is2FAEnabled": false,
    "currentChain": "Sepolia",
    "currentChainId": 11155111,
    "groupMembershipCount": 3,
    "wallet": {
      "address": "0x046d38bdf90c76528c924c0e85334ca114e5798b",
      "balance": 0.0508,
      "balances": {
        "eth": 0.0508,
        "usdc": 0
      },
      "balanceSource": "live",
      "openfortPlayerId": "player_a715cfa3-8552-4093-afcf-3ddbb8318db1",
      "openfortAccountId": "wallet_690d0702-865f-4983-a0b2-79ef76876776",
      "lastSyncAt": "2025-10-27T18:37:06.158Z",
      "provisioningStatus": "provisioned"
    }
  }
}
```

### Update User Profile
- **Method**: `PUT`
- **URL**: `/api/users/profile`

**Request Body:**
```json
{
  "firstName": "John",     // optional
  "lastName": "Doe",       // optional
  "phoneNumber": "+1234567890", // optional
  "avatarUrl": "https://..." // optional
}
```

### Delete User Account
- **Method**: `DELETE`
- **URL**: `/api/users/account`

### Get User by ID
- **Method**: `GET`
- **URL**: `/api/users/:userId`

### Get User Groups
- **Method**: `GET`
- **URL**: `/api/users/groups`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Apartment 4B",
      "description": "Shared expenses for apartment",
      "role": "ADMIN",
      "memberCount": 4
    }
  ]
}
```

### Get User Wallet
- **Method**: `GET`
- **URL**: `/api/users/wallet`

### Provision User Wallet
- **Method**: `POST`
- **URL**: `/api/users/wallet/provision`

### Get User Notifications
- **Method**: `GET`
- **URL**: `/api/users/notifications`

### Mark Notification as Read
- **Method**: `PUT`
- **URL**: `/api/users/notifications/:notificationId/read`

### Mark All Notifications as Read
- **Method**: `PUT`
- **URL**: `/api/users/notifications/read-all`

---

## 👥 Group Endpoints

Base path: `/api/groups`
**Auth Required**: Yes (all endpoints)

### Create Group
- **Method**: `POST`
- **URL**: `/api/groups`

**Request Body:**
```json
{
  "name": "Apartment 4B",
  "description": "Shared expenses for apartment", // optional
  "smartAccountAddress": "0x..." // optional, can be generated server-side
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Apartment 4B",
    "description": "Shared expenses for apartment",
    "smartAccountAddress": "0x...",
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z",
    "memberCount": 1
  }
}
```

### Get User's Groups
- **Method**: `GET`
- **URL**: `/api/groups`

### Get Group by ID
- **Method**: `GET`
- **URL**: `/api/groups/:groupId`
- **Access**: Group members only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Apartment 4B",
    "description": "Shared expenses for apartment",
    "smartAccountAddress": "0x...",
    "balance": "250.75",
    "memberCount": 4,
    "votingThreshold": 51,
    "isActive": true,
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z"
  }
}
```

### Update Group
- **Method**: `PUT`
- **URL**: `/api/groups/:groupId`
- **Access**: Group admins only

**Request Body:**
```json
{
  "name": "Updated Group Name", // optional
  "description": "Updated description", // optional
  "votingThreshold": 60 // optional
}
```

### Delete Group
- **Method**: `DELETE`
- **URL**: `/api/groups/:groupId`
- **Access**: Group admins only

### Invite Members to Group
- **Method**: `POST`
- **URL**: `/api/groups/:groupId/invite`
- **Access**: Group admins only

**Request Body:**
```json
{
  "emails": ["user1@example.com", "user2@example.com"],
  "role": "MEMBER" // or "ADMIN"
}
```

### Join Group
- **Method**: `POST`
- **URL**: `/api/groups/:groupId/join`

**Request Body:**
```json
{
  "inviteToken": "invite_token"
}
```

### Get Group Members
- **Method**: `GET`
- **URL**: `/api/groups/:groupId/members`
- **Access**: Group members

### Add Member to Group
- **Method**: `POST`
- **URL**: `/api/groups/:groupId/members`
- **Access**: Group admins only

### Update Member Role
- **Method**: `PUT`
- **URL**: `/api/groups/:groupId/members/:memberId`
- **Access**: Group admins only

### Remove Member from Group
- **Method**: `DELETE`
- **URL**: `/api/groups/:groupId/members/:memberId`
- **Access**: Group admins only

### Get Group Bills
- **Method**: `GET`
- **URL**: `/api/groups/:groupId/bills`
- **Access**: Group members
- **Query Parameters**: `page` (optional), `limit` (optional)

### Get Group Transactions
- **Method**: `GET`
- **URL**: `/api/groups/:groupId/transactions`
- **Access**: Group members
- **Query Parameters**: `page` (optional), `limit` (optional)

### Get Group Proposals
- **Method**: `GET`
- **URL**: `/api/groups/:groupId/proposals`
- **Access**: Group members

---

## 🧾 Bill Endpoints

Base path: `/api/bills`
**Auth Required**: Yes (all endpoints)

### Create Bill
- **Method**: `POST`
- **URL**: `/api/bills`
- **Access**: Group members

**Request Body:**
```json
{
  "groupId": "uuid",
  "title": "June Rent",
  "description": "Monthly rent payment", // optional
  "totalAmount": 1200.00,
  "currency": "USDC", // optional, default: USDC
  "dueDate": "2025-06-01T00:00:00Z", // optional
  "payeeAddress": "0x...",
  "categoryId": "uuid", // optional
  "attachmentUrl": "https://...", // optional
  "items": [ // optional
    {
      "description": "Rent",
      "amount": 1000.00,
      "quantity": 1
    },
    {
      "description": "Utilities",
      "amount": 200.00,
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "groupId": "uuid",
    "createdBy": "uuid",
    "title": "June Rent",
    "description": "Monthly rent payment",
    "totalAmount": 1200.00,
    "currency": "USDC",
    "dueDate": "2025-06-01T00:00:00Z",
    "payeeAddress": "0x...",
    "categoryId": "uuid",
    "attachmentUrl": "https://...",
    "status": "DRAFT",
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z",
    "items": [
      {
        "id": "uuid",
        "description": "Rent",
        "amount": 1000.00,
        "quantity": 1
      }
    ]
  }
}
```

### Get User Bills
- **Method**: `GET`
- **URL**: `/api/bills`
- **Query Parameters**: `page` (optional), `limit` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "bills": [
      {
        "id": "uuid",
        "title": "June Rent",
        "totalAmount": 1200.00,
        "status": "DRAFT",
        "dueDate": "2025-06-01T00:00:00Z",
        "group": {
          "id": "uuid",
          "name": "Apartment 4B"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

### Get Bill by ID
- **Method**: `GET`
- **URL**: `/api/bills/:billId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "June Rent",
    "description": "Monthly rent payment",
    "totalAmount": 1200.00,
    "currency": "USDC",
    "status": "PROPOSED",
    "items": [
      {
        "id": "uuid",
        "description": "Rent",
        "amount": 1000.00,
        "quantity": 1
      }
    ],
    "creator": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "category": {
      "id": "uuid",
      "name": "Housing",
      "color": "#FF5733"
    },
    "group": {
      "id": "uuid",
      "name": "Apartment 4B"
    },
    "proposal": {
      "id": "uuid",
      "status": "ACTIVE",
      "votesFor": 2,
      "votesAgainst": 0,
      "votesAbstain": 0,
      "votes": [
        {
          "id": "uuid",
          "userId": "uuid",
          "voteType": "FOR",
          "comment": "Looks good",
          "votedAt": "2025-01-15T15:00:00Z",
          "user": {
            "username": "alice"
          }
        }
      ]
    },
    "transactions": [
      {
        "id": "uuid",
        "amount": 400.00,
        "type": "BILL_PAYMENT",
        "status": "COMPLETED",
        "sender": {
          "id": "uuid",
          "username": "alice"
        }
      }
    ]
  }
}
```

### Update Bill
- **Method**: `PATCH`
- **URL**: `/api/bills/:billId`
- **Access**: Bill creator or group admin

**Request Body:** Any subset of fields from create bill request, plus:
```json
{
  "status": "APPROVED" // DRAFT, PROPOSED, APPROVED, REJECTED, PAID, CANCELLED
}
```

### Delete Bill
- **Method**: `DELETE`
- **URL**: `/api/bills/:billId`
- **Access**: Bill creator or group admin

### Get Bill Transactions
- **Method**: `GET`
- **URL**: `/api/bills/:billId/transactions`
- **Access**: Group members

---

## 📋 Proposal Endpoints

Base path: `/api/proposals`
**Auth Required**: Yes (all endpoints)

### Create Proposal
- **Method**: `POST`
- **URL**: `/api/proposals`
- **Access**: Group members

**Request Body:**
```json
{
  "billId": "uuid",
  "title": "Approve June Rent Payment",
  "description": "Proposal to approve and pay June rent", // optional
  "votingDeadline": "2025-06-15T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billId": "uuid",
    "groupId": "uuid",
    "createdBy": "uuid",
    "title": "Approve June Rent Payment",
    "description": "Proposal to approve and pay June rent",
    "status": "ACTIVE",
    "votesFor": 0,
    "votesAgainst": 0,
    "votesAbstain": 0,
    "votingDeadline": "2025-06-15T23:59:59Z",
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z"
  }
}
```

### Get Group Proposals
- **Method**: `GET`
- **URL**: `/api/proposals/groups/:groupId`
- **Access**: Group members

### Get Proposal by ID
- **Method**: `GET`
- **URL**: `/api/proposals/:proposalId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Approve June Rent Payment",
    "status": "ACTIVE",
    "votesFor": 2,
    "votesAgainst": 0,
    "votesAbstain": 1,
    "votingDeadline": "2025-06-15T23:59:59Z",
    "votes": [
      {
        "id": "uuid",
        "userId": "uuid",
        "voteType": "FOR",
        "comment": "Approved",
        "votedAt": "2025-01-15T15:00:00Z",
        "user": {
          "username": "alice"
        }
      }
    ]
  }
}
```

### Vote on Proposal
- **Method**: `POST`
- **URL**: `/api/proposals/:proposalId/votes`
- **Access**: Group members

**Request Body:**
```json
{
  "isApproved": true, // true for FOR, false for AGAINST
  "comment": "I approve this payment" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "APPROVED", // may change if threshold met
    "votesFor": 3,
    "votesAgainst": 0,
    "votesAbstain": 0
  }
}
```

### Execute Proposal
- **Method**: `POST`
- **URL**: `/api/proposals/:proposalId/execute`
- **Access**: Proposal creator or group admin

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "EXECUTED",
    "executedAt": "2025-01-15T16:00:00Z"
  }
}
```

---

## 💰 Transaction Endpoints

Base path: `/api/transactions`
**Auth Required**: Yes (all endpoints)
**Rate Limited**: Yes (all endpoints)

### Create Transaction
- **Method**: `POST`
- **URL**: `/api/transactions`

**Request Body:**
```json
{
  "billId": "uuid", // optional, for bill payments
  "groupId": "uuid", // optional, for group transactions
  "amount": 400.00,
  "currency": "USDC", // optional, default: USDC
  "type": "BILL_PAYMENT", // DEPOSIT, WITHDRAWAL, TRANSFER, BILL_PAYMENT
  "toAddress": "0x...", // optional, for transfers
  "description": "Alice's share of rent" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billId": "uuid",
    "groupId": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "amount": 400.00,
    "currency": "USDC",
    "txHash": "0x...",
    "status": "PENDING",
    "type": "BILL_PAYMENT",
    "description": "Alice's share of rent",
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z"
  }
}
```

### Get Transaction by ID
- **Method**: `GET`
- **URL**: `/api/transactions/:transactionId`

### Get Transaction Intent Status
- **Method**: `GET`
- **URL**: `/api/transactions/intent/:intentId/status`
- **Description**: Check Openfort transaction intent status

---

## 💳 Budget Category Endpoints

Base path: `/api/budget`
**Auth Required**: Yes (all endpoints)

### Get Group Categories
- **Method**: `GET`
- **URL**: `/api/budget/groups/:groupId/categories`
- **Access**: Group members

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "groupId": "uuid",
      "name": "Housing",
      "color": "#FF5733",
      "icon": "home",
      "monthlyLimit": 1500.00,
      "isActive": true,
      "createdAt": "2025-01-15T14:00:00Z"
    }
  ]
}
```

### Create Category
- **Method**: `POST`
- **URL**: `/api/budget/categories`
- **Access**: Group admin

**Request Body:**
```json
{
  "groupId": "uuid",
  "name": "Housing",
  "color": "#FF5733", // optional
  "icon": "home", // optional
  "monthlyLimit": 1500.00
}
```

### Update Category
- **Method**: `PATCH`
- **URL**: `/api/budget/categories/:categoryId`
- **Access**: Group admin

**Request Body:**
```json
{
  "name": "Updated Housing", // optional
  "color": "#FF5733", // optional
  "icon": "home", // optional
  "monthlyLimit": 1600.00, // optional
  "isActive": true // optional
}
```

### Delete Category
- **Method**: `DELETE`
- **URL**: `/api/budget/categories/:categoryId`
- **Access**: Group admin

---

## 🔄 Recurring Bill Endpoints

Base path: `/api/recurring`
**Auth Required**: Yes (all endpoints)

### Get Group Recurring Schedules
- **Method**: `GET`
- **URL**: `/api/recurring/groups/:groupId/recurring`
- **Access**: Group members

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "groupId": "uuid",
      "title": "Monthly Rent",
      "description": "Recurring monthly rent payment",
      "amount": 1200.00,
      "currency": "USDC",
      "payeeAddress": "0x...",
      "frequency": "MONTHLY",
      "startDate": "2025-01-01T00:00:00Z",
      "nextDueDate": "2025-02-01T00:00:00Z",
      "endDate": null,
      "isActive": true,
      "autoPropose": true,
      "categoryId": "uuid",
      "createdAt": "2025-01-15T14:00:00Z",
      "updatedAt": "2025-01-15T14:00:00Z"
    }
  ]
}
```

### Create Recurring Schedule
- **Method**: `POST`
- **URL**: `/api/recurring/recurring`
- **Access**: Group admin

**Request Body:**
```json
{
  "groupId": "uuid",
  "title": "Monthly Rent",
  "description": "Recurring monthly rent payment", // optional
  "amount": 1200.00,
  "currency": "USDC",
  "payeeAddress": "0x...",
  "frequency": "MONTHLY", // WEEKLY, MONTHLY, QUARTERLY, YEARLY
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": null, // optional
  "autoPropose": true,
  "categoryId": "uuid" // optional
}
```

### Update Recurring Schedule
- **Method**: `PATCH`
- **URL**: `/api/recurring/recurring/:recurringId`
- **Access**: Group admin

**Request Body:** Any subset of fields from create, plus:
```json
{
  "nextDueDate": "2025-02-01T00:00:00Z", // optional
  "isActive": false // optional, to pause/resume
}
```

### Delete Recurring Schedule
- **Method**: `DELETE`
- **URL**: `/api/recurring/recurring/:recurringId`
- **Access**: Group admin
- **Note**: Soft-deactivates the schedule (sets `isActive=false`)

### Process Due Recurring Bills
- **Method**: `POST`
- **URL**: `/api/recurring/recurring/process`
- **Access**: Authenticated (typically used by cron jobs)
- **Description**: Creates bills for schedules with `nextDueDate <= now`

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 3
  }
}
```

---

## 🔐 Two-Factor Authentication (2FA) Endpoints

Base path: `/api/2fa`
**Auth Required**: Yes (all endpoints)

### Setup 2FA
- **Method**: `POST`
- **URL**: `/api/2fa/setup`

**Response:**
```json
{
  "success": true,
  "message": "2FA setup initiated. Please verify with your authenticator app.",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "secret": "JBSWY3DPEHPK3PXP",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "I9J0K1L2",
    "M3N4O5P6",
    "Q7R8S9T0",
    "U1V2W3X4",
    "Y5Z6A7B8",
    "C9D0E1F2"
  ]
}
```

### Verify 2FA Setup
- **Method**: `POST`
- **URL**: `/api/2fa/verify-setup`

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA has been successfully enabled"
}
```

### Verify 2FA Token
- **Method**: `POST`
- **URL**: `/api/2fa/verify`

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA verification successful"
}
```

### Disable 2FA
- **Method**: `POST`
- **URL**: `/api/2fa/disable`

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA has been disabled successfully"
}
```

### Generate New Backup Codes
- **Method**: `POST`
- **URL**: `/api/2fa/backup-codes`

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "New backup codes generated successfully",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    "I9J0K1L2",
    "M3N4O5P6",
    "Q7R8S9T0",
    "U1V2W3X4",
    "Y5Z6A7B8",
    "C9D0E1F2"
  ]
}
```

---

## 🏥 Health Check Endpoints

Base path: `/health`
**Auth Required**: No

### Basic Health Check
- **Method**: `GET`
- **URL**: `/health`

**Response:**
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2025-01-15T14:00:00Z"
}
```

### Blockchain Health Check
- **Method**: `GET`
- **URL**: `/health/blockchain`

**Response:**
```json
{
  "status": "ok",
  "blockchain": "connected",
  "network": "polygon-amoy",
  "timestamp": "2025-01-15T14:00:00Z"
}
```

---

## 🔧 Common Patterns

### Authentication Header
For all protected endpoints, include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Pagination
Many list endpoints support pagination with query parameters:
- `page`: Page number (starts from 1)
- `limit`: Items per page (default: 20, max: 100)

Example: `/api/bills?page=2&limit=10`

### Error Handling
Always check the `success` field in the response:
```javascript
const response = await fetch('/api/bills', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();

if (data.success) {
  // Handle success
  console.log(data.data);
} else {
  // Handle error
  console.error(data.error);
  if (data.errors) {
    // Handle validation errors
    console.error(data.errors);
  }
}
```

### Rate Limiting
Some endpoints have rate limiting:
- Authentication endpoints: Stricter limits
- Transaction endpoints: Transaction-specific limits
- Password reset endpoints: Special limits

If you hit rate limits, you'll receive a `429 Too Many Requests` response.

---

## 📝 Notes for Frontend Developers

1. **Token Management**: Store JWT tokens securely and implement automatic refresh logic
2. **Error Handling**: Always handle both network errors and API errors
3. **Loading States**: Implement loading states for better UX
4. **Validation**: Validate data on the frontend before sending to API
5. **Real-time Updates**: Consider implementing WebSocket connections for real-time updates on proposals and transactions
6. **Blockchain Integration**: Use Openfort SDK on the frontend for wallet operations
7. **Environment Variables**: Set `NEXT_PUBLIC_API_URL` to point to your backend

## 🔗 Related Documentation

- [Frontend API Integration Guide](./FRONTEND_API_GUIDE.md) - Detailed implementation guide
- [Postman Endpoints](./POSTMAN_ENDPOINTS.md) - Postman collection format
- [Authentication Guide](../AUTHENTICATION.md) - Detailed authentication flow
- [Main README](./README.md) - Full-stack overview and contracts

## Response Format

All API endpoints return a standardized response envelope:

### Success Response
```json
{
  "success": true,
  "message": "Optional success message",
  "data": { /* Response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "errors": {
    "field": ["Validation error messages"]
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## 🔐 Authentication Endpoints

Base path: `/api/auth`

### Register User
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "securePassword123",
  "firstName": "John", // optional
  "lastName": "Doe"    // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Login User
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "emailOrUsername": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as register

### Refresh Token
- **Method**: `POST`
- **URL**: `/api/auth/refresh`
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token"
  }
}
```

### Get Current User
- **Method**: `GET`
- **URL**: `/api/auth/me`
- **Auth Required**: Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe"
    },
    "wallet": {
      "address": "0x...",
      "balance": "100.50"
    }
  }
}
```

### Logout
- **Method**: `POST`
- **URL**: `/api/auth/logout`
- **Auth Required**: Yes

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

### Logout All Devices
- **Method**: `POST`
- **URL**: `/api/auth/logout-all`
- **Auth Required**: Yes

### Change Password
- **Method**: `POST`
- **URL**: `/api/auth/change-password`
- **Auth Required**: Yes

**Request Body:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newSecurePassword123"
}
```

### Forgot Password
- **Method**: `POST`
- **URL**: `/api/auth/forgot-password`
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### Reset Password
- **Method**: `POST`
- **URL**: `/api/auth/reset-password`
- **Auth Required**: No
- **Rate Limited**: Yes

**Request Body:**
```json
{
  "token": "reset_token",
  "newPassword": "newSecurePassword123"
}
```

---

## 👤 User Endpoints

Base path: `/api/users`
**Auth Required**: Yes (all endpoints)

### Get User Profile
- **Method**: `GET`
- **URL**: `/api/users/profile`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "avatarUrl": "https://..."
    },
    "wallet": {
      "address": "0x...",
      "balance": "100.50"
    }
  }
}
```

### Update User Profile
- **Method**: `PUT`
- **URL**: `/api/users/profile`

**Request Body:**
```json
{
  "firstName": "John",     // optional
  "lastName": "Doe",       // optional
  "phoneNumber": "+1234567890", // optional
  "avatarUrl": "https://..." // optional
}
```

### Delete User Account
- **Method**: `DELETE`
- **URL**: `/api/users/account`

### Get User by ID
- **Method**: `GET`
- **URL**: `/api/users/:userId`

### Get User Groups
- **Method**: `GET`
- **URL**: `/api/users/groups`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Apartment 4B",
      "description": "Shared expenses for apartment",
      "role": "ADMIN",
      "memberCount": 4
    }
  ]
}
```

### Get User Wallet
- **Method**: `GET`
- **URL**: `/api/users/wallet`

### Provision User Wallet
- **Method**: `POST`
- **URL**: `/api/users/wallet/provision`

### Get User Notifications
- **Method**: `GET`
- **URL**: `/api/users/notifications`

### Mark Notification as Read
- **Method**: `PUT`
- **URL**: `/api/users/notifications/:notificationId/read`

### Mark All Notifications as Read
- **Method**: `PUT`
- **URL**: `/api/users/notifications/read-all`

---

## 👥 Group Endpoints

Base path: `/api/groups`
**Auth Required**: Yes (all endpoints)

### Create Group
- **Method**: `POST`
- **URL**: `/api/groups`

**Request Body:**
```json
{
  "name": "Apartment 4B",
  "description": "Shared expenses for apartment", // optional
  "smartAccountAddress": "0x..." // optional, can be generated server-side
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Apartment 4B",
    "description": "Shared expenses for apartment",
    "smartAccountAddress": "0x...",
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z",
    "memberCount": 1
  }
}
```

### Get User's Groups
- **Method**: `GET`
- **URL**: `/api/groups`

### Get Group by ID
- **Method**: `GET`
- **URL**: `/api/groups/:groupId`
- **Access**: Group members only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Apartment 4B",
    "description": "Shared expenses for apartment",
    "smartAccountAddress": "0x...",
    "balance": "250.75",
    "memberCount": 4,
    "votingThreshold": 51,
    "isActive": true,
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z"
  }
}
```

### Update Group
- **Method**: `PUT`
- **URL**: `/api/groups/:groupId`
- **Access**: Group admins only

**Request Body:**
```json
{
  "name": "Updated Group Name", // optional
  "description": "Updated description", // optional
  "votingThreshold": 60 // optional
}
```

### Delete Group
- **Method**: `DELETE`
- **URL**: `/api/groups/:groupId`
- **Access**: Group admins only

### Invite Members to Group
- **Method**: `POST`
- **URL**: `/api/groups/:groupId/invite`
- **Access**: Group admins only

**Request Body:**
```json
{
  "emails": ["user1@example.com", "user2@example.com"],
  "role": "MEMBER" // or "ADMIN"
}
```

### Join Group
- **Method**: `POST`
- **URL**: `/api/groups/:groupId/join`

**Request Body:**
```json
{
  "inviteToken": "invite_token"
}
```

### Get Group Members
- **Method**: `GET`
- **URL**: `/api/groups/:groupId/members`
- **Access**: Group members

### Add Member to Group
- **Method**: `POST`
- **URL**: `/api/groups/:groupId/members`
- **Access**: Group admins only

### Update Member Role
- **Method**: `PUT`
- **URL**: `/api/groups/:groupId/members/:memberId`
- **Access**: Group admins only

### Remove Member from Group
- **Method**: `DELETE`
- **URL**: `/api/groups/:groupId/members/:memberId`
- **Access**: Group admins only

### Get Group Bills
- **Method**: `GET`
- **URL**: `/api/groups/:groupId/bills`
- **Access**: Group members
- **Query Parameters**: `page` (optional), `limit` (optional)

### Get Group Transactions
- **Method**: `GET`
- **URL**: `/api/groups/:groupId/transactions`
- **Access**: Group members
- **Query Parameters**: `page` (optional), `limit` (optional)

### Get Group Proposals
- **Method**: `GET`
- **URL**: `/api/groups/:groupId/proposals`
- **Access**: Group members

---

## 🧾 Bill Endpoints

Base path: `/api/bills`
**Auth Required**: Yes (all endpoints)

### Create Bill
- **Method**: `POST`
- **URL**: `/api/bills`
- **Access**: Group members

**Request Body:**
```json
{
  "groupId": "uuid",
  "title": "June Rent",
  "description": "Monthly rent payment", // optional
  "totalAmount": 1200.00,
  "currency": "USDC", // optional, default: USDC
  "dueDate": "2025-06-01T00:00:00Z", // optional
  "payeeAddress": "0x...",
  "categoryId": "uuid", // optional
  "attachmentUrl": "https://...", // optional
  "items": [ // optional
    {
      "description": "Rent",
      "amount": 1000.00,
      "quantity": 1
    },
    {
      "description": "Utilities",
      "amount": 200.00,
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "groupId": "uuid",
    "createdBy": "uuid",
    "title": "June Rent",
    "description": "Monthly rent payment",
    "totalAmount": 1200.00,
    "currency": "USDC",
    "dueDate": "2025-06-01T00:00:00Z",
    "payeeAddress": "0x...",
    "categoryId": "uuid",
    "attachmentUrl": "https://...",
    "status": "DRAFT",
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z",
    "items": [
      {
        "id": "uuid",
        "description": "Rent",
        "amount": 1000.00,
        "quantity": 1
      }
    ]
  }
}
```

### Get User Bills
- **Method**: `GET`
- **URL**: `/api/bills`
- **Query Parameters**: `page` (optional), `limit` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "bills": [
      {
        "id": "uuid",
        "title": "June Rent",
        "totalAmount": 1200.00,
        "status": "DRAFT",
        "dueDate": "2025-06-01T00:00:00Z",
        "group": {
          "id": "uuid",
          "name": "Apartment 4B"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

### Get Bill by ID
- **Method**: `GET`
- **URL**: `/api/bills/:billId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "June Rent",
    "description": "Monthly rent payment",
    "totalAmount": 1200.00,
    "currency": "USDC",
    "status": "PROPOSED",
    "items": [
      {
        "id": "uuid",
        "description": "Rent",
        "amount": 1000.00,
        "quantity": 1
      }
    ],
    "creator": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "category": {
      "id": "uuid",
      "name": "Housing",
      "color": "#FF5733"
    },
    "group": {
      "id": "uuid",
      "name": "Apartment 4B"
    },
    "proposal": {
      "id": "uuid",
      "status": "ACTIVE",
      "votesFor": 2,
      "votesAgainst": 0,
      "votesAbstain": 0,
      "votes": [
        {
          "id": "uuid",
          "userId": "uuid",
          "voteType": "FOR",
          "comment": "Looks good",
          "votedAt": "2025-01-15T15:00:00Z",
          "user": {
            "username": "alice"
          }
        }
      ]
    },
    "transactions": [
      {
        "id": "uuid",
        "amount": 400.00,
        "type": "BILL_PAYMENT",
        "status": "COMPLETED",
        "sender": {
          "id": "uuid",
          "username": "alice"
        }
      }
    ]
  }
}
```

### Update Bill
- **Method**: `PATCH`
- **URL**: `/api/bills/:billId`
- **Access**: Bill creator or group admin

**Request Body:** Any subset of fields from create bill request, plus:
```json
{
  "status": "APPROVED" // DRAFT, PROPOSED, APPROVED, REJECTED, PAID, CANCELLED
}
```

### Delete Bill
- **Method**: `DELETE`
- **URL**: `/api/bills/:billId`
- **Access**: Bill creator or group admin

### Get Bill Transactions
- **Method**: `GET`
- **URL**: `/api/bills/:billId/transactions`
- **Access**: Group members

---

## 📋 Proposal Endpoints

Base path: `/api/proposals`
**Auth Required**: Yes (all endpoints)

### Create Proposal
- **Method**: `POST`
- **URL**: `/api/proposals`
- **Access**: Group members

**Request Body:**
```json
{
  "billId": "uuid",
  "title": "Approve June Rent Payment",
  "description": "Proposal to approve and pay June rent", // optional
  "votingDeadline": "2025-06-15T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billId": "uuid",
    "groupId": "uuid",
    "createdBy": "uuid",
    "title": "Approve June Rent Payment",
    "description": "Proposal to approve and pay June rent",
    "status": "ACTIVE",
    "votesFor": 0,
    "votesAgainst": 0,
    "votesAbstain": 0,
    "votingDeadline": "2025-06-15T23:59:59Z",
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z"
  }
}
```

### Get Group Proposals
- **Method**: `GET`
- **URL**: `/api/proposals/groups/:groupId`
- **Access**: Group members

### Get Proposal by ID
- **Method**: `GET`
- **URL**: `/api/proposals/:proposalId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Approve June Rent Payment",
    "status": "ACTIVE",
    "votesFor": 2,
    "votesAgainst": 0,
    "votesAbstain": 1,
    "votingDeadline": "2025-06-15T23:59:59Z",
    "votes": [
      {
        "id": "uuid",
        "userId": "uuid",
        "voteType": "FOR",
        "comment": "Approved",
        "votedAt": "2025-01-15T15:00:00Z",
        "user": {
          "username": "alice"
        }
      }
    ]
  }
}
```

### Vote on Proposal
- **Method**: `POST`
- **URL**: `/api/proposals/:proposalId/votes`
- **Access**: Group members

**Request Body:**
```json
{
  "isApproved": true, // true for FOR, false for AGAINST
  "comment": "I approve this payment" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "APPROVED", // may change if threshold met
    "votesFor": 3,
    "votesAgainst": 0,
    "votesAbstain": 0
  }
}
```

### Execute Proposal
- **Method**: `POST`
- **URL**: `/api/proposals/:proposalId/execute`
- **Access**: Proposal creator or group admin

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "EXECUTED",
    "executedAt": "2025-01-15T16:00:00Z"
  }
}
```

---

## 💰 Transaction Endpoints

Base path: `/api/transactions`
**Auth Required**: Yes (all endpoints)
**Rate Limited**: Yes (all endpoints)

### Create Transaction
- **Method**: `POST`
- **URL**: `/api/transactions`

**Request Body:**
```json
{
  "billId": "uuid", // optional, for bill payments
  "groupId": "uuid", // optional, for group transactions
  "amount": 400.00,
  "currency": "USDC", // optional, default: USDC
  "type": "BILL_PAYMENT", // DEPOSIT, WITHDRAWAL, TRANSFER, BILL_PAYMENT
  "toAddress": "0x...", // optional, for transfers
  "description": "Alice's share of rent" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "billId": "uuid",
    "groupId": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "amount": 400.00,
    "currency": "USDC",
    "txHash": "0x...",
    "status": "PENDING",
    "type": "BILL_PAYMENT",
    "description": "Alice's share of rent",
    "createdAt": "2025-01-15T14:00:00Z",
    "updatedAt": "2025-01-15T14:00:00Z"
  }
}
```

### Get Transaction by ID
- **Method**: `GET`
- **URL**: `/api/transactions/:transactionId`

### Get Transaction Intent Status
- **Method**: `GET`
- **URL**: `/api/transactions/intent/:intentId/status`
- **Description**: Check Openfort transaction intent status

---

## 💳 Budget Category Endpoints

Base path: `/api/budget`
**Auth Required**: Yes (all endpoints)

### Get Group Categories
- **Method**: `GET`
- **URL**: `/api/budget/groups/:groupId/categories`
- **Access**: Group members

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "groupId": "uuid",
      "name": "Housing",
      "color": "#FF5733",
      "icon": "home",
      "monthlyLimit": 1500.00,
      "isActive": true,
      "createdAt": "2025-01-15T14:00:00Z"
    }
  ]
}
```

### Create Category
- **Method**: `POST`
- **URL**: `/api/budget/categories`
- **Access**: Group admin

**Request Body:**
```json
{
  "groupId": "uuid",
  "name": "Housing",
  "color": "#FF5733", // optional
  "icon": "home", // optional
  "monthlyLimit": 1500.00
}
```

### Update Category
- **Method**: `PATCH`
- **URL**: `/api/budget/categories/:categoryId`
- **Access**: Group admin

**Request Body:**
```json
{
  "name": "Updated Housing", // optional
  "color": "#FF5733", // optional
  "icon": "home", // optional
  "monthlyLimit": 1600.00, // optional
  "isActive": true // optional
}
```

### Delete Category
- **Method**: `DELETE`
- **URL**: `/api/budget/categories/:categoryId`
- **Access**: Group admin

---

## 🔄 Recurring Bill Endpoints

Base path: `/api/recurring`
**Auth Required**: Yes (all endpoints)

### Get Group Recurring Schedules
- **Method**: `GET`
- **URL**: `/api/recurring/groups/:groupId/recurring`
- **Access**: Group members

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "groupId": "uuid",
      "title": "Monthly Rent",
      "description": "Recurring monthly rent payment",
      "amount": 1200.00,
      "currency": "USDC",
      "payeeAddress": "0x...",
      "frequency": "MONTHLY",
      "startDate": "2025-01-01T00:00:00Z",
      "nextDueDate": "2025-02-01T00:00:00Z",
      "endDate": null,
      "isActive": true,
      "autoPropose": true,
      "categoryId": "uuid",
      "createdAt": "2025-01-15T14:00:00Z",
      "updatedAt": "2025-01-15T14:00:00Z"
    }
  ]
}
```

### Create Recurring Schedule
- **Method**: `POST`
- **URL**: `/api/recurring/recurring`
- **Access**: Group admin

**Request Body:**
```json
{
  "groupId": "uuid",
  "title": "Monthly Rent",
  "description": "Recurring monthly rent payment", // optional
  "amount": 1200.00,
  "currency": "USDC",
  "payeeAddress": "0x...",
  "frequency": "MONTHLY", // WEEKLY, MONTHLY, QUARTERLY, YEARLY
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": null, // optional
  "autoPropose": true,
  "categoryId": "uuid" // optional
}
```

### Update Recurring Schedule
- **Method**: `PATCH`
- **URL**: `/api/recurring/recurring/:recurringId`
- **Access**: Group admin

**Request Body:** Any subset of fields from create, plus:
```json
{
  "nextDueDate": "2025-02-01T00:00:00Z", // optional
  "isActive": false // optional, to pause/resume
}
```

### Delete Recurring Schedule
- **Method**: `DELETE`
- **URL**: `/api/recurring/recurring/:recurringId`
- **Access**: Group admin
- **Note**: Soft-deactivates the schedule (sets `isActive=false`)

### Process Due Recurring Bills
- **Method**: `POST`
- **URL**: `/api/recurring/recurring/process`
- **Access**: Authenticated (typically used by cron jobs)
- **Description**: Creates bills for schedules with `nextDueDate <= now`

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 3
  }
}
```

---

## 🏥 Health Check Endpoints

Base path: `/health`
**Auth Required**: No

### Basic Health Check
- **Method**: `GET`
- **URL**: `/health`

**Response:**
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2025-01-15T14:00:00Z"
}
```

### Blockchain Health Check
- **Method**: `GET`
- **URL**: `/health/blockchain`

**Response:**
```json
{
  "status": "ok",
  "blockchain": "connected",
  "network": "polygon-amoy",
  "timestamp": "2025-01-15T14:00:00Z"
}
```

---

## 🔧 Common Patterns

### Authentication Header
For all protected endpoints, include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Pagination
Many list endpoints support pagination with query parameters:
- `page`: Page number (starts from 1)
- `limit`: Items per page (default: 20, max: 100)

Example: `/api/bills?page=2&limit=10`

### Error Handling
Always check the `success` field in the response:
```javascript
const response = await fetch('/api/bills', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();

if (data.success) {
  // Handle success
  console.log(data.data);
} else {
  // Handle error
  console.error(data.error);
  if (data.errors) {
    // Handle validation errors
    console.error(data.errors);
  }
}
```

### Rate Limiting
Some endpoints have rate limiting:
- Authentication endpoints: Stricter limits
- Transaction endpoints: Transaction-specific limits
- Password reset endpoints: Special limits

If you hit rate limits, you'll receive a `429 Too Many Requests` response.

---

## 📝 Notes for Frontend Developers

1. **Token Management**: Store JWT tokens securely and implement automatic refresh logic
2. **Error Handling**: Always handle both network errors and API errors
3. **Loading States**: Implement loading states for better UX
4. **Validation**: Validate data on the frontend before sending to API
5. **Real-time Updates**: Consider implementing WebSocket connections for real-time updates on proposals and transactions
6. **Blockchain Integration**: Use Openfort SDK on the frontend for wallet operations
7. **Environment Variables**: Set `NEXT_PUBLIC_API_URL` to point to your backend

## 🔗 Related Documentation

- [Frontend API Integration Guide](./FRONTEND_API_GUIDE.md) - Detailed implementation guide
- [Postman Endpoints](./POSTMAN_ENDPOINTS.md) - Postman collection format
- [Authentication Guide](../AUTHENTICATION.md) - Detailed authentication flow
- [Main README](./README.md) - Full-stack overview and contracts