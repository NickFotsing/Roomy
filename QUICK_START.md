# 🚀 Quick Start Guide - Roomy Authentication System

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

## Setup in 5 Minutes

### Step 1: Create Environment File

Create a `.env` file in the project root:

```bash
# Copy this content to your .env file
PORT=3001
NODE_ENV=development

DATABASE_URL="postgresql://username:password@localhost:5432/roomy_db?schema=public"

JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-change-in-production-min-32-chars"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

FRONTEND_URL="http://localhost:3000"

PASSWORD_RESET_EXPIRATION=60
EMAIL_VERIFICATION_EXPIRATION=24
```

> ⚠️ **Important:** Change the JWT secrets before deploying to production!

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name add_authentication

# (Optional) Open Prisma Studio to view your database
npx prisma studio
```

### Step 4: Start the Server

```bash
# Development mode with hot reload
npm run dev

# The server will start on http://localhost:3001
```

## Test the API

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2025-10-24T..."
}
```

### 2. Register a User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "testuser",
    "password": "Test123!"
  }'
```

**Save the `accessToken` from the response!**

### 4. Get Your Profile

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## API Endpoints Overview

### Public Endpoints (No Auth Required)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Protected Endpoints (Auth Required)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout-all` - Logout from all devices
- `POST /api/auth/change-password` - Change password
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/groups` - Get user's groups
- `GET /api/users/wallet` - Get user's wallet

### Group Endpoints (Role-Based)
- `POST /api/groups` - Create group (any user)
- `GET /api/groups/:groupId` - Get group (members only)
- `PUT /api/groups/:groupId` - Update group (admins only)
- `DELETE /api/groups/:groupId` - Delete group (admins only)
- `GET /api/groups/:groupId/members` - Get members (members only)
- `POST /api/groups/:groupId/members` - Add member (admins only)

## Using with Postman

### 1. Import Collection

Create a new collection with these requests:

#### Environment Variables
```
baseUrl: http://localhost:3001
accessToken: (will be set after login)
refreshToken: (will be set after login)
```

#### Register Request
```
POST {{baseUrl}}/api/auth/register
Body (JSON):
{
  "email": "postman@example.com",
  "username": "postmanuser",
  "password": "Postman123!",
  "firstName": "Postman",
  "lastName": "User"
}

Tests (to save tokens):
pm.environment.set("accessToken", pm.response.json().data.accessToken);
pm.environment.set("refreshToken", pm.response.json().data.refreshToken);
```

#### Login Request
```
POST {{baseUrl}}/api/auth/login
Body (JSON):
{
  "emailOrUsername": "postmanuser",
  "password": "Postman123!"
}

Tests:
pm.environment.set("accessToken", pm.response.json().data.accessToken);
pm.environment.set("refreshToken", pm.response.json().data.refreshToken);
```

#### Get Profile Request
```
GET {{baseUrl}}/api/auth/me
Headers:
Authorization: Bearer {{accessToken}}
```

## Authentication Flow

```
┌─────────────┐
│   Register  │ → Returns access + refresh tokens
└─────────────┘
       ↓
┌─────────────┐
│    Login    │ → Returns access + refresh tokens
└─────────────┘
       ↓
┌─────────────┐
│ Use Access  │ → Include in Authorization header
│   Token     │   "Bearer YOUR_ACCESS_TOKEN"
└─────────────┘
       ↓
  Token Expires? (15 min)
       ↓
┌─────────────┐
│   Refresh   │ → Send refresh token to get new access token
│    Token    │
└─────────────┘
       ↓
  Refresh Expires? (7 days)
       ↓
┌─────────────┐
│ Login Again │
└─────────────┘
```

## Password Requirements

Your password must include:
- ✅ At least 8 characters
- ✅ 1 uppercase letter (A-Z)
- ✅ 1 lowercase letter (a-z)
- ✅ 1 number (0-9)
- ✅ 1 special character (!@#$%^&*...)

## Common Errors and Solutions

### "Missing required environment variables"
**Solution:** Create a `.env` file with all required variables (see Step 1)

### "connect ECONNREFUSED" or database errors
**Solution:** 
1. Make sure PostgreSQL is running
2. Check your DATABASE_URL in `.env`
3. Run `npx prisma migrate dev`

### "Invalid or expired token"
**Solution:** 
1. Access tokens expire after 15 minutes
2. Use the refresh token endpoint: `POST /api/auth/refresh`
3. Or login again

### "Validation failed"
**Solution:** Check the error response for specific field validation errors

### "Account is locked"
**Solution:** 
- Wait 30 minutes for auto-unlock
- Or use password reset to unlock immediately

## Project Structure

```
src/
├── config/          # Configuration (env vars)
├── controllers/     # Request handlers
│   ├── authController.ts
│   └── userController.ts
├── middleware/      # Express middleware
│   ├── auth.ts      # Authentication & authorization
│   └── validation.ts
├── services/        # Business logic
│   └── authService.ts
├── utils/           # Utility functions
│   ├── jwt.ts
│   ├── password.ts
│   └── response.ts
├── validators/      # Input validation schemas
│   └── authValidators.ts
└── routes/          # API routes
    ├── authRoutes.ts
    ├── userRoutes.ts
    ├── groupRoutes.ts
    └── billRoutes.ts
```

## Next Steps

1. ✅ Test all authentication endpoints
2. ✅ Implement group and bill controllers
3. ✅ Set up email service for verification
4. ✅ Add rate limiting
5. ✅ Set up frontend integration
6. ✅ Deploy to production

## Useful Commands

```bash
# Development
npm run dev                    # Start dev server with hot reload

# Database
npx prisma studio              # Open database GUI
npx prisma migrate dev         # Create and apply migration
npx prisma generate            # Generate Prisma client
npx prisma db push             # Push schema changes (dev only)

# Production
npm run build                  # Build for production
npm start                      # Start production server

# Utilities
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run migrations
npm run prisma:studio          # Open Prisma Studio
```

## Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET and JWT_REFRESH_SECRET to strong random values
- [ ] Use a secure PostgreSQL database with strong password
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set NODE_ENV=production
- [ ] Configure CORS for your production frontend URL
- [ ] Set up database backups
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Review and test all endpoints
- [ ] Set up email service for password resets

## Documentation

For detailed documentation, see:
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Complete authentication system documentation
- [README.md](./README.md) - Project overview

## Support

If you encounter any issues:
1. Check the error message in the API response
2. Review the console logs
3. Check the documentation
4. Create an issue in the repository

---

**Happy coding! 🎉**

