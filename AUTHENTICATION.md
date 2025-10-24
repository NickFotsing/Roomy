# 🔐 Roomy Authentication System Documentation

## Overview

This document provides a comprehensive guide to the authentication system implemented for the Roomy application. The system uses JWT (JSON Web Tokens) for stateless authentication with refresh token rotation for enhanced security.

## Table of Contents

- [Features](#features)
- [Setup](#setup)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Usage Examples](#usage-examples)
- [Security Features](#security-features)
- [Role-Based Access Control](#role-based-access-control)

---

## Features

✅ **User Registration & Login**
- Email and username-based registration
- Secure password hashing with bcrypt
- Password strength validation

✅ **JWT Token Management**
- Access tokens (short-lived, 15 minutes)
- Refresh tokens (long-lived, 7 days)
- Token refresh mechanism
- Token revocation on logout

✅ **Security Features**
- Account lockout after failed login attempts
- Password reset with time-limited tokens
- Email verification support (structure in place)
- CORS configuration
- Helmet security headers

✅ **Role-Based Access Control (RBAC)**
- Group membership verification
- Role-based permissions (ADMIN, MEMBER, VIEWER)
- Protected routes and endpoints

---

## Setup

### 1. Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/roomy_db?schema=public"

# JWT Configuration (CHANGE THESE IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-change-this-in-production-min-32-chars"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Token Expiration Settings
PASSWORD_RESET_EXPIRATION=60
EMAIL_VERIFICATION_EXPIRATION=24
```

### 2. Database Migration

Run Prisma migrations to create the necessary database tables:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name add_authentication

# Open Prisma Studio (optional)
npx prisma studio
```

### 3. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

---

## Architecture

### Directory Structure

```
src/
├── config/
│   └── config.ts                 # Configuration management
├── controllers/
│   ├── authController.ts         # Authentication endpoints
│   └── userController.ts         # User management endpoints
├── middleware/
│   ├── auth.ts                   # Authentication & authorization middleware
│   └── validation.ts             # Validation error handler
├── services/
│   └── authService.ts            # Authentication business logic
├── utils/
│   ├── jwt.ts                    # JWT token utilities
│   ├── password.ts               # Password hashing & validation
│   └── response.ts               # Standardized API responses
├── validators/
│   └── authValidators.ts         # Input validation schemas
└── routes/
    ├── authRoutes.ts             # Authentication routes
    ├── userRoutes.ts             # User routes
    ├── groupRoutes.ts            # Group routes (with RBAC)
    └── billRoutes.ts             # Bill routes (with RBAC)
```

### Database Schema Updates

New models added for authentication:

```prisma
model RefreshToken {
  id          String   @id @default(uuid())
  userId      String
  token       String   @unique
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  isRevoked   Boolean  @default(false)
  user        User     @relation(...)
}

model PasswordResetToken {
  id          String   @id @default(uuid())
  userId      String
  token       String   @unique
  expiresAt   DateTime
  isUsed      Boolean  @default(false)
  createdAt   DateTime @default(now())
  user        User     @relation(...)
}
```

User model enhancements:
- `failedLoginAttempts` - Track failed login attempts
- `accountLockedUntil` - Account lockout timestamp
- `lastLoginAt` - Last successful login

---

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register a new user | ❌ |
| POST | `/login` | Login user | ❌ |
| POST | `/refresh` | Refresh access token | ❌ |
| POST | `/logout` | Logout (revoke refresh token) | ❌ |
| POST | `/logout-all` | Logout from all devices | ✅ |
| POST | `/forgot-password` | Request password reset | ❌ |
| POST | `/reset-password` | Reset password with token | ❌ |
| POST | `/change-password` | Change password (authenticated) | ✅ |
| GET | `/me` | Get current user profile | ✅ |

### User Routes (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/profile` | Get user profile | ✅ |
| PUT | `/profile` | Update user profile | ✅ |
| DELETE | `/account` | Delete user account | ✅ |
| GET | `/:userId` | Get user by ID | ✅ |
| GET | `/groups` | Get user's groups | ✅ |
| GET | `/wallet` | Get user's wallet | ✅ |
| GET | `/notifications` | Get notifications | ✅ |
| PUT | `/notifications/:id/read` | Mark notification as read | ✅ |
| PUT | `/notifications/read-all` | Mark all as read | ✅ |

### Group Routes (`/api/groups`)

| Method | Endpoint | Description | Access Level |
|--------|----------|-------------|--------------|
| POST | `/` | Create group | Authenticated |
| GET | `/` | Get user's groups | Authenticated |
| GET | `/:groupId` | Get group details | Group Member |
| PUT | `/:groupId` | Update group | Group Admin |
| DELETE | `/:groupId` | Delete group | Group Admin |
| GET | `/:groupId/members` | Get members | Group Member |
| POST | `/:groupId/members` | Add member | Group Admin |
| PUT | `/:groupId/members/:memberId` | Update member role | Group Admin |
| DELETE | `/:groupId/members/:memberId` | Remove member | Group Admin |
| GET | `/:groupId/bills` | Get group bills | Group Member |

---

## Authentication Flow

### Registration Flow

```
1. User submits registration form
   ↓
2. Validate input (email, username, password strength)
   ↓
3. Check if user already exists
   ↓
4. Hash password with bcrypt
   ↓
5. Create user in database
   ↓
6. Generate JWT access & refresh tokens
   ↓
7. Store refresh token in database
   ↓
8. Return user data + tokens
```

### Login Flow

```
1. User submits credentials (email/username + password)
   ↓
2. Find user in database
   ↓
3. Check if account is locked
   ↓
4. Verify password
   ├─ Invalid → Increment failed attempts (lock if max reached)
   └─ Valid → Reset failed attempts
   ↓
5. Generate new JWT tokens
   ↓
6. Store refresh token
   ↓
7. Update lastLoginAt
   ↓
8. Return user data + tokens
```

### Token Refresh Flow

```
1. Client sends expired access token + valid refresh token
   ↓
2. Verify refresh token signature
   ↓
3. Check if refresh token exists in DB and not revoked
   ↓
4. Get updated user data
   ↓
5. Generate new access token
   ↓
6. Return new access token
```

### Protected Route Flow

```
1. Client sends request with Authorization header
   ↓
2. Extract JWT token (Bearer token)
   ↓
3. Verify token signature & expiration
   ↓
4. Check if user still exists
   ↓
5. Check if account is locked
   ↓
6. Attach user data to request
   ↓
7. Proceed to route handler
```

---

## Usage Examples

### 1. Register a New User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "isEmailVerified": false,
      "createdAt": "2025-10-24T..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 2. Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "emailOrUsername": "johndoe",
  "password": "SecurePass123!"
}
```

### 3. Access Protected Route

```bash
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 4. Refresh Access Token

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 5. Change Password

```bash
POST /api/auth/change-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

### 6. Request Password Reset

```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### 7. Reset Password

```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass456!"
}
```

---

## Security Features

### 1. Password Security
- **Minimum Requirements:**
  - At least 8 characters
  - 1 uppercase letter
  - 1 lowercase letter
  - 1 number
  - 1 special character
- **Hashing:** bcrypt with 10 salt rounds

### 2. Account Lockout
- **Max Failed Attempts:** 5
- **Lockout Duration:** 30 minutes
- **Auto-unlock:** After lockout period expires

### 3. Token Security
- **Access Token:** Short-lived (15 minutes)
- **Refresh Token:** Long-lived (7 days)
- **Token Storage:** Refresh tokens stored in database
- **Token Revocation:** On logout or password change

### 4. Password Reset
- **Token Expiration:** 60 minutes
- **Single Use:** Tokens invalidated after use
- **Secure Delivery:** Should be sent via email (not implemented yet)

### 5. HTTP Security
- **CORS:** Configured for specific frontend origin
- **Helmet:** Security headers enabled
- **Input Validation:** express-validator for all inputs

---

## Role-Based Access Control

### User Roles in Groups

```typescript
enum MemberRole {
  ADMIN   // Full control over group
  MEMBER  // Can view, create bills, vote
  VIEWER  // Read-only access
}
```

### Middleware Functions

#### 1. `authenticate`
Verifies JWT token and attaches user to request.

```typescript
router.get('/protected', authenticate, handler);
```

#### 2. `requireGroupMembership`
Ensures user is a member of the specified group.

```typescript
router.get('/groups/:groupId', 
  authenticate, 
  requireGroupMembership('groupId'), 
  handler
);
```

#### 3. `requireGroupRole`
Ensures user has a specific role in the group.

```typescript
router.put('/groups/:groupId',
  authenticate,
  requireGroupRole([MemberRole.ADMIN], 'groupId'),
  handler
);
```

#### 4. `requireEmailVerification`
Ensures user's email is verified.

```typescript
router.post('/sensitive-action',
  authenticate,
  requireEmailVerification,
  handler
);
```

### Access Control Examples

```typescript
// Any authenticated user can create a group
router.post('/groups', authenticate, createGroup);

// Only group members can view group details
router.get('/groups/:groupId', 
  authenticate, 
  requireGroupMembership('groupId'), 
  getGroup
);

// Only admins can delete groups
router.delete('/groups/:groupId',
  authenticate,
  requireGroupRole([MemberRole.ADMIN], 'groupId'),
  deleteGroup
);

// Admins and members can create bills (but not viewers)
router.post('/groups/:groupId/bills',
  authenticate,
  requireGroupRole([MemberRole.ADMIN, MemberRole.MEMBER], 'groupId'),
  createBill
);
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "errors": {
    "field": ["Validation error message"]
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Unprocessable Entity (validation failed)
- `500` - Internal Server Error

---

## Testing the API

### Using cURL

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"Test123!"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"testuser","password":"Test123!"}'

# Get profile (with token)
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman

1. Import the collection (create one based on the endpoints above)
2. Set environment variable `{{baseUrl}}` = `http://localhost:3001`
3. After login, save `accessToken` to environment variable
4. Use `{{accessToken}}` in Authorization header

---

## Next Steps

### Recommended Implementations

1. **Email Service Integration**
   - Email verification
   - Password reset emails
   - Notification emails

2. **Rate Limiting**
   - Prevent brute force attacks
   - API rate limiting per user

3. **Two-Factor Authentication (2FA)**
   - TOTP support
   - SMS verification

4. **Social Authentication**
   - Google OAuth
   - GitHub OAuth

5. **Audit Logging**
   - Track authentication events
   - Monitor suspicious activity

6. **Session Management**
   - View active sessions
   - Revoke specific sessions

---

## Troubleshooting

### Common Issues

**1. "Missing required environment variables"**
- Ensure `.env` file exists with all required variables
- Check `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`

**2. "Invalid or expired token"**
- Access token may have expired (15 min lifetime)
- Use refresh token to get a new access token
- Re-login if refresh token expired

**3. "Account is locked"**
- Wait 30 minutes for auto-unlock
- Or reset password to unlock immediately

**4. "User not found"**
- Check email/username spelling
- Ensure user is registered

**5. Database connection errors**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Run `npx prisma migrate dev`

---

## Contributing

When adding new authenticated endpoints:

1. Import middleware: `import { authenticate } from '../middleware/auth'`
2. Apply middleware: `router.get('/endpoint', authenticate, handler)`
3. Access user: `req.user.userId` in your handler
4. Add appropriate role checks if needed

---

## Security Checklist

✅ Passwords are hashed with bcrypt
✅ JWT secrets are stored in environment variables
✅ Tokens have expiration times
✅ Refresh tokens are stored securely in database
✅ Failed login attempts are tracked
✅ Accounts lock after max failed attempts
✅ Password reset tokens expire
✅ Input validation on all endpoints
✅ CORS configured for specific origin
✅ Security headers with Helmet
✅ Role-based access control implemented

🔲 Email verification (structure in place)
🔲 Rate limiting (recommended)
🔲 Two-factor authentication (recommended)
🔲 Audit logging (recommended)

---

## License

This authentication system is part of the Roomy project.

---

## Support

For issues or questions, please contact the development team or create an issue in the repository.

**Happy Coding! 🚀**

