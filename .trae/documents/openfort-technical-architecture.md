# Openfort Blockchain Integration - Technical Architecture Document

## 1. Architecture Design

```mermaid
graph TD
    A[User Browser] --> B[React Frontend Application]
    B --> C[Express.js Backend API]
    C --> D[Openfort SDK]
    C --> E[PostgreSQL Database]
    C --> F[Ethereum Sepolia RPC]
    D --> G[Openfort Service]
    
    subgraph "Frontend Layer"
        B
    end
    
    subgraph "Backend Layer"
        C
        E
    end
    
    subgraph "Blockchain Layer"
        F
        G
    end
    
    subgraph "External Services"
        G
    end
```

## 2. Technology Description

* **Frontend**: React\@18 + TypeScript + Vite + TailwindCSS

* **Backend**: Node.js + Express\@4 + TypeScript + Prisma ORM

* **Database**: PostgreSQL (Neon hosted)

* **Blockchain**: Openfort wallet infrastructure + Ethereum Sepolia testnet

* **Authentication**: JWT tokens with refresh mechanism

## 3. Route Definitions

| Route                               | Purpose                                              |
| ----------------------------------- | ---------------------------------------------------- |
| /api/auth/login                     | User authentication and JWT token generation         |
| /api/auth/register                  | User registration with automatic wallet provisioning |
| /api/users/profile                  | User profile with integrated wallet balance          |
| /api/users/wallet                   | Wallet details and balance information               |
| /api/users/wallet/provision         | Manual wallet provisioning endpoint                  |
| /api/groups                         | Group management with smart account integration      |
| /api/groups/:id                     | Group details including smart account balance        |
| /api/transactions                   | Transaction creation and management                  |
| /api/transactions/deposit           | Deposit funds to group smart accounts                |
| /api/transactions/transfer          | Transfer funds from group to recipients              |
| /api/transactions/intent/:id/status | Monitor Openfort transaction intent status           |

## 4. API Definitions

### 4.1 Core Authentication APIs

**User Registration with Wallet Provisioning**

```
POST /api/auth/register
```

Request:

| Param Name | Param Type | isRequired | Description                 |
| ---------- | ---------- | ---------- | --------------------------- |
| email      | string     | true       | User email address          |
| password   | string     | true       | User password (min 8 chars) |
| username   | string     | true       | Unique username             |
| firstName  | string     | false      | User first name             |
| lastName   | string     | false      | User last name              |

Response:

| Param Name   | Param Type | Description                |
| ------------ | ---------- | -------------------------- |
| success      | boolean    | Registration status        |
| data         | object     | User data with wallet info |
| token        | string     | JWT access token           |
| refreshToken | string     | JWT refresh token          |

Example Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "johndoe"
    },
    "wallet": {
      "address": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
      "chainId": 11155111,
      "openfortPlayerId": "player_abc123"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 4.2 Wallet Management APIs

**Get User Wallet with Live Balance**

```
GET /api/users/wallet
```

Response:

| Param Name | Param Type | Description        |
| ---------- | ---------- | ------------------ |
| success    | boolean    | Request status     |
| data       | object     | Wallet information |

Example Response:

```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": "wallet_123",
      "address": "0x742d35Cc6634C0532925a3b8D4C9db96590c6C87",
      "balance": "0.025",
      "chainId": 11155111,
      "isActive": true,
      "liveBalance": "0.0247",
      "lastSyncAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Provision User Wallet**

```
POST /api/users/wallet/provision
```

Response:

| Param Name | Param Type | Description         |
| ---------- | ---------- | ------------------- |
| success    | boolean    | Provisioning status |
| data       | object     | Wallet details      |

### 4.3 Group Smart Account APIs

**Create Group with Smart Account**

```
POST /api/groups
```

Request:

| Param Name          | Param Type | isRequired | Description                        |
| ------------------- | ---------- | ---------- | ---------------------------------- |
| name                | string     | true       | Group name                         |
| description         | string     | false      | Group description                  |
| smartAccountAddress | string     | false      | Pre-existing smart account address |

Response:

| Param Name | Param Type | Description                   |
| ---------- | ---------- | ----------------------------- |
| success    | boolean    | Creation status               |
| data       | object     | Group with smart account info |

Example Response:

```json
{
  "success": true,
  "data": {
    "group": {
      "id": "group_456",
      "name": "Vacation Fund",
      "smartAccountAddress": "0x8ba1f109551bD432803012645Hac136c22C501e5",
      "balance": "0.0",
      "memberCount": 1
    }
  }
}
```

**Get Group Details with Balance**

```
GET /api/groups/:id
```

Response includes real-time smart account balance fetched from blockchain.

### 4.4 Transaction APIs

**Create Deposit Transaction**

```
POST /api/transactions/deposit
```

Request:

| Param Name  | Param Type | isRequired | Description                            |
| ----------- | ---------- | ---------- | -------------------------------------- |
| groupId     | string     | true       | Target group ID                        |
| amount      | number     | true       | Amount to deposit (min 0.000001)       |
| currency    | string     | false      | Currency type (ETH/USDC, default: ETH) |
| description | string     | false      | Transaction description                |

Response:

| Param Name | Param Type | Description                      |
| ---------- | ---------- | -------------------------------- |
| success    | boolean    | Transaction creation status      |
| data       | object     | Transaction with Openfort intent |

Example Response:

```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "txn_789",
      "type": "DEPOSIT",
      "amount": "0.001",
      "currency": "ETH",
      "status": "PENDING",
      "toAddress": "0x8ba1f109551bD432803012645Hac136c22C501e5",
      "openfortIntentId": "intent_abc123",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Create Transfer Transaction**

```
POST /api/transactions/transfer
```

Request:

| Param Name  | Param Type | isRequired | Description              |
| ----------- | ---------- | ---------- | ------------------------ |
| groupId     | string     | true       | Source group ID          |
| toAddress   | string     | true       | Recipient wallet address |
| amount      | number     | true       | Amount to transfer       |
| currency    | string     | false      | Currency type (ETH/USDC) |
| description | string     | false      | Transfer description     |

**Monitor Transaction Intent Status**

```
GET /api/transactions/intent/:intentId/status
```

Response:

| Param Name | Param Type | Description           |
| ---------- | ---------- | --------------------- |
| success    | boolean    | Status fetch result   |
| data       | object     | Intent status details |

Example Response:

```json
{
  "success": true,
  "data": {
    "intent": {
      "id": "intent_abc123",
      "status": "completed",
      "transactionHash": "0x1234567890abcdef...",
      "chainId": 11155111,
      "to": "0x8ba1f109551bD432803012645Hac136c22C501e5",
      "value": "1000000000000000",
      "playerId": "player_xyz789"
    }
  }
}
```

## 5. Server Architecture Diagram

```mermaid
graph TD
    A[Client Request] --> B[Express Router]
    B --> C[Authentication Middleware]
    C --> D[Validation Middleware]
    D --> E[Controller Layer]
    E --> F[Service Layer]
    F --> G[Openfort Service]
    F --> H[Database Layer]
    G --> I[Openfort API]
    H --> J[(PostgreSQL)]
    
    subgraph "Middleware Stack"
        C
        D
    end
    
    subgraph "Application Layer"
        E
        F
    end
    
    subgraph "Data Layer"
        H
        J
    end
    
    subgraph "External Services"
        G
        I
    end
```

## 6. Data Model

### 6.1 Data Model Definition

```mermaid
erDiagram
    USER ||--o| WALLET : has
    USER ||--o{ GROUP_MEMBER : belongs_to
    GROUP ||--o{ GROUP_MEMBER : contains
    GROUP ||--|| SMART_ACCOUNT : has
    USER ||--o{ TRANSACTION : creates
    GROUP ||--o{ TRANSACTION : receives
    TRANSACTION ||--o| OPENFORT_INTENT : tracks
    
    USER {
        string id PK
        string email UK
        string username UK
        string password_hash
        string firstName
        string lastName
        boolean isEmailVerified
        datetime createdAt
        datetime updatedAt
    }
    
    WALLET {
        string id PK
        string userId FK
        string openfortPlayerId
        string openfortAccountId
        string address
        int chainId
        decimal balance
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
    
    GROUP {
        string id PK
        string name
        string description
        string smartAccountAddress UK
        decimal balance
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
    
    GROUP_MEMBER {
        string id PK
        string userId FK
        string groupId FK
        string role
        boolean isActive
        datetime joinedAt
    }
    
    TRANSACTION {
        string id PK
        string userId FK
        string groupId FK
        string type
        decimal amount
        string currency
        string status
        string toAddress
        string description
        json metadata
        datetime createdAt
        datetime updatedAt
    }
```

### 6.2 Data Definition Language

**Users Table**

```sql
-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    avatar_url TEXT,
    is_email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

**Wallets Table**

```sql
-- Create wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    openfort_player_id VARCHAR(255) NOT NULL,
    openfort_account_id VARCHAR(255),
    address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 11155111,
    balance DECIMAL(20, 8) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_address ON wallets(address);
CREATE INDEX idx_wallets_openfort_player_id ON wallets(openfort_player_id);
```

**Groups Table**

```sql
-- Create groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    smart_account_address VARCHAR(42) UNIQUE,
    balance DECIMAL(20, 8) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_groups_name ON groups(name);
CREATE UNIQUE INDEX idx_groups_smart_account_address ON groups(smart_account_address) WHERE smart_account_address IS NOT NULL;
```

**Group Members Table**

```sql
-- Create group_members table
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX idx_group_members_user_group ON group_members(user_id, group_id) WHERE is_active = TRUE;
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
```

**Transactions Table**

```sql
-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'ETH',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    to_address VARCHAR(42),
    from_address VARCHAR(42),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_group_id ON transactions(group_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
```

**Initial Data**

```sql
-- Insert sample data for development
INSERT INTO users (email, username, password_hash, first_name, last_name, is_email_verified)
VALUES 
    ('admin@roomy.app', 'admin', '$2b$10$example_hash', 'Admin', 'User', TRUE),
    ('demo@roomy.app', 'demo', '$2b$10$example_hash', 'Demo', 'User', TRUE);

-- Note: Wallets and groups will be created automatically via API calls
```

## 7. Openfort Integration Specifications

### 7.1 Environment Configuration

Required environment variables:

```bash
# Openfort Configuration
OPENFORT_API_PUBLIC_KEY=pk_test_9eb95c20-7fcc-5999-b70c-7da1783bfe3b
OPENFORT_API_SECRET_KEY=sk_test_a4df61aa-ad5b-57fe-bc47-a70dcdedb6c1
OPENFORT_CHAIN_ID=11155111

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
```

### 7.2 Openfort Service Implementation

Key service functions:

* `ensureWalletForUser()` - Provisions Openfort embedded wallets

* `createGroupSmartAccount()` - Creates group smart accounts

* `createTransactionIntent()` - Initiates blockchain transactions

* `getTransactionIntent()` - Monitors transaction status

* `getAddressBalance()` - Fetches live balance via RPC

### 7.3 Error Handling Strategy

* Graceful fallback to mock data in development mode

* Comprehensive error logging for Openfort API failures

* Retry mechanisms for network-related failures

* User-friendly error messages for validation failures

### 7.4 Security Considerations

* API keys stored securely in environment variables

* No private key exposure in application code

* Address validation for all blockchain operations

* Amount validation with minimum thresholds

* Rate limiting on transaction endpoints

## 8. Deployment Architecture

### 8.1 Production Environment

* **Backend**: Node.js application on cloud hosting (Railway/Vercel)

* **Database**: PostgreSQL on Neon with connection pooling

* **Frontend**: React SPA with static hosting

* **Monitoring**: Application logs and error tracking

* **Security**: HTTPS, CORS configuration, API rate limiting

### 8.2 Development Environment

* Local PostgreSQL or Neon development database

* Openfort sandbox/test environment

* Hot reload for rapid development

* Mock data fallbacks for offline development

