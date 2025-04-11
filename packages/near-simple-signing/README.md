# @crosspost/near-simple-signing

NEAR wallet signature generation utility for authentication with the Crosspost API and other
services.

## Overview

This package provides a simple way to generate NEAR wallet signatures for authentication with the
Crosspost API or any other service that uses NEAR wallet signatures for authentication. It works in
both browser and server environments, and supports both Node.js and Deno.

## Features

- Connect to NEAR wallets in browser environments
- Generate properly formatted signatures
- Create authentication headers
- Validate signatures
- Support for both browser and server-side signing
- Compatible with both Node.js and Deno

## Installation

### Node.js / npm

```bash
# Using npm
npm install @crosspost/near-simple-signing

# Using yarn
yarn add @crosspost/near-simple-signing

# Using pnpm
pnpm add @crosspost/near-simple-signing

# Using bun
bun add @crosspost/near-simple-signing
```

### Deno

```typescript
// Import from JSR
import { NearSigner } from '@crosspost/near-simple-signing';

// Or import directly from GitHub
import { NearSigner } from 'https://raw.githubusercontent.com/your-org/crosspost/main/packages/near-simple-signing/mod.ts';
```

## Usage

### Browser Environment

In a browser environment, the NearSigner will connect to a NEAR wallet:

```typescript
import { NearSigner } from '@crosspost/near-simple-signing';

// Initialize the signer
const signer = new NearSigner({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
});

// Connect to the wallet
await signer.connect();

// Create an authentication header
const authHeader = await signer.createAuthHeader('message-to-sign');

// Use the auth header in your API requests
fetch('https://api.example.com/endpoint', {
  headers: {
    'Authorization': `NEAR ${authHeader}`,
  },
});
```

### Server Environment

In a server environment, you need to provide an account ID and key pair:

```typescript
import { NearSigner } from '@crosspost/near-simple-signing';
import { KeyPair } from 'near-api-js';

// Create a key pair
const keyPair = KeyPair.fromString('ed25519:your-private-key');

// Initialize the signer
const signer = new NearSigner({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  accountId: 'your-account.testnet',
  keyPair: keyPair,
});

// Create an authentication header
const authHeader = await signer.createAuthHeader('message-to-sign');

// Use the auth header in your API requests
fetch('https://api.example.com/endpoint', {
  headers: {
    'Authorization': `NEAR ${authHeader}`,
  },
});
```

### Validating Signatures

You can also validate signatures:

```typescript
import { NearSigner } from '@crosspost/near-simple-signing';

// Initialize the signer
const signer = new NearSigner({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
});

// Validate a signature
const result = await signer.validateSignature(
  'signature',
  'message',
  'public-key',
  'nonce',
  'recipient',
);

if (result.valid) {
  console.log('Signature is valid');
} else {
  console.error('Signature is invalid:', result.error);
}
```

## API Reference

### `NearSigner`

The main class for generating NEAR wallet signatures.

#### Constructor

```typescript
constructor(options: NearSignerOptions)
```

Options:

- `networkId`: Network ID ('mainnet' or 'testnet')
- `nodeUrl`: RPC node URL
- `walletUrl`: Wallet URL (for browser environment)
- `accountId`: Account ID (for server environment)
- `keyPair`: Key pair (for server environment)
- `defaultRecipient`: Default recipient for signatures (optional, default: 'crosspost.near')

#### Methods

- `connect()`: Connect to NEAR wallet (browser only)
- `getAccount()`: Get the connected account
- `sign(message, recipient?, callbackUrl?)`: Sign a message
- `createAuthHeader(message, recipient?, callbackUrl?)`: Create an authentication header
- `validateSignature(signature, message, publicKey, nonce, recipient?)`: Validate a signature

## License

MIT
