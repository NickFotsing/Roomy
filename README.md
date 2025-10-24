# Roomy - Group Expense Management with Blockchain

Roomy is a group expense management application that uses blockchain technology for secure and transparent bill splitting and payments.

## Tech Stack

- **Frontend**: React with TailwindCSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain Integration**: Openfort SDK

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- PostgreSQL
- Openfort account (for wallet integration)

### Backend Setup

1. Clone the repository:
   ```
   git clone https://github.com/NickFotsing/Roomy.git
   cd Roomy
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` (if not already created)
   - Update the database connection string and other environment variables

4. Set up the database:
   ```
   npm run prisma:migrate
   npm run prisma:generate
   ```

5. Start the development server:
   ```
   npm run dev
   ```

### API Endpoints

- **Users**
  - `POST /api/users/register` - Register a new user
  - `POST /api/users/login` - Login
  - `GET /api/users/profile` - Get user profile
  - `PUT /api/users/profile` - Update user profile

- **Groups**
  - `POST /api/groups` - Create a new group
  - `GET /api/groups` - Get all groups
  - `GET /api/groups/:id` - Get group by ID
  - `PUT /api/groups/:id` - Update group
  - `DELETE /api/groups/:id` - Delete group

- **Bills**
  - `POST /api/bills` - Create a new bill
  - `GET /api/bills` - Get all bills
  - `GET /api/bills/:id` - Get bill by ID
  - `PUT /api/bills/:id` - Update bill
  - `DELETE /api/bills/:id` - Delete bill

## Database Schema

The application uses the following data models:

- **User**: User accounts with wallet integration
- **Group**: Expense groups with shared wallets
- **GroupMember**: User membership in groups
- **Bill**: Expense records
- **Vote**: Voting on bill approval
- **Transaction**: Payment transactions

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio to manage database

## Blockchain Integration

Roomy uses Openfort SDK for:
- Embedded wallet creation for users
- Group smart accounts for shared expenses
- Transaction execution for bill payments
- Multi-signature approvals for expenses