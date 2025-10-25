# Group Creation & Openfort Integration

This document describes the current issue with group smart account provisioning, and outlines what the Next.js frontend and the Node backend should each do to make group creation reliable.

## Issue Summary
- When creating a group, `smartAccountAddress` is `null` because the backend attempts to call `POST /v1/wallets` to create an embedded wallet. This path is not a valid public REST endpoint, resulting in `404 Cannot POST /v1/wallets`.
- Embedded wallet provisioning is intended to happen on the client via Openfort’s React Kit. Server-side typically handles creating Players, session keys, and transaction intents — not embedded wallet creation.
- As a result, the backend cannot currently provision a group smart account address, and groups are saved with `smartAccountAddress = null`.

## Frontend (Next.js) Responsibilities
- Initialize Openfort React Kit with the publishable key (`OPENFORT_API_PUBLIC_KEY`).
- During user login/connect, provision the embedded wallet on the client (Openfort handles creation). Ensure recovery strategy (Shield) is configured if using automatic recovery.
- After wallet is ready, obtain the user’s on-chain address (EOA/smart account, depending on Kit setup).
- Decide which model to use for group addresses:
  - Client-provided address model: pass the relevant address to the backend when creating a group.
  - Server-owned address model: simply create the group; the backend will assign and persist a server-controlled address.
- UI: Provide a simple create-group form (name, description, optional `smartAccountAddress` when using client-provided model).

## Backend Responsibilities
- Stop calling `POST /v1/wallets` in `openfortService.ts` — this causes the 404 and prevents provisioning.
- Continue server-side Openfort usage as appropriate:
  - Create/reuse a Player with `OPENFORT_API_SECRET_KEY`.
  - Optionally register session keys and create transaction intents.
- Choose one of two approaches for group addresses:
  1) Client-provided address model:
     - Accept `smartAccountAddress` in `POST /api/groups` (from the client’s embedded wallet).
     - Validate and persist it on the group.
  2) Server-owned address model (Backend Wallets):
     - Create or retrieve a server-controlled EOA/smart account for the group.
     - Persist its address on the group.
- Fetch balances via JSON-RPC (e.g., Polygon Amoy) using `getAddressBalance()`.
- Keep explicit logs on Openfort/RPC failures in `groupService.ts` to aid diagnosis.

## API Contracts (Recommended)
- `POST /api/groups`
  - Client-provided model: `{ name: string, description?: string, smartAccountAddress: string }`
  - Server-owned model: `{ name: string, description?: string }`
  - Response: group object `{ id, name, description, smartAccountAddress }`
- `GET /api/groups/:id`
  - Returns group details and balance: `{ id, name, smartAccountAddress, balance }`

## Environment Requirements
- `OPENFORT_API_PUBLIC_KEY` (frontend)
- `OPENFORT_API_SECRET_KEY` (backend)
- `OPENFORT_ENVIRONMENT` (e.g., `sandbox`)
- `AMOY_RPC_URL` (Polygon Amoy RPC URL)
- Recommended: `JWT_SECRET`, `JWT_REFRESH_SECRET` for backend auth

## Implementation Notes
- We already removed `email` from `createPlayer` payload to fix `422 Validation Failed`.
- Remove or disable the server call to `POST /v1/wallets` in `src/services/openfortService.ts` and any callers.
- Keep `ensureWalletForUser` for server-to-server Player provisioning during session creation if desired.
- `groupService.ts` should either:
  - Accept and persist the client-provided address, or
  - Create/assign a server-owned backend wallet address to the group.
- Balance fetching remains via JSON-RPC using the persisted address.

## Recommended Flows
### A) Client-Provided Address (Embedded Wallet on Frontend)
1. User logs into the Next.js app; Openfort React Kit initializes the embedded wallet.
2. Client obtains the wallet/smart account address.
3. Client calls `POST /api/groups` with the address.
4. Backend validates and saves the group with `smartAccountAddress` and returns it.
5. Client shows the group details; backend provides balance via `GET /api/groups/:id`.

### B) Server-Owned Address (Backend Wallets)
1. Client calls `POST /api/groups` without an address.
2. Backend creates/retrieves a server-controlled address (backend wallet) for the group.
3. Backend persists `smartAccountAddress` on the group and returns it.
4. Balance fetching works as above.

## Testing Checklist
- Frontend:
  - Verify Openfort React Kit initialization with publishable key.
  - Confirm wallet provisioning on login/connect.
  - Confirm address retrieval and submission (client-provided model).
- Backend:
  - Confirm no calls to `POST /v1/wallets` remain.
  - Create Player and handle session/transaction intents as needed.
  - Validate/persist `smartAccountAddress` (or assign backend wallet address).
  - Verify `GET /api/groups/:id` returns expected balance via Amoy RPC.

## Summary
- The 404 arises from an invalid server call to `/v1/wallets`.
- Move embedded wallet provisioning to the Next.js frontend via Openfort React Kit, or adopt server-owned backend wallets for groups.
- Adjust the group creation API accordingly, ensuring `smartAccountAddress` is set from either the client or backend, and maintain clear logging for failure cases.