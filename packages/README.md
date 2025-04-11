# Crosspost API SDK

This monorepo contains the SDK packages for interacting with the Crosspost API.

## Packages

| Package                                                 | Description                              | npm | JSR |
| ------------------------------------------------------- | ---------------------------------------- | --- | --- |
| [@crosspost/types](./types)                             | Shared type definitions                  | ✅  | ✅  |
| [@crosspost/near-simple-signing](./near-simple-signing) | NEAR wallet signature generation utility | ✅  | ✅  |
| [@crosspost/sdk](./sdk)                                 | Main API client SDK                      | ✅  | ❌  |

## Installation

### Node.js / npm

```bash
# Install all packages
npm install @crosspost/sdk @crosspost/near-simple-signing @crosspost/types

# Or install individual packages
npm install @crosspost/sdk
npm install @crosspost/near-simple-signing
npm install @crosspost/types
```

### Deno

```typescript
// Import from JSR
import { NearSigner } from '@crosspost/near-simple-signing';
import { PlatformName } from '@crosspost/types';

// Or import directly from GitHub
import { NearSigner } from 'https://raw.githubusercontent.com/your-org/crosspost/main/packages/near-simple-signing/mod.ts';
import { PlatformName } from 'https://raw.githubusercontent.com/your-org/crosspost/main/packages/types/mod.ts';
```

## Usage Example

```typescript
import { CrosspostClient } from '@crosspost/sdk';
import { NearSigner } from '@crosspost/near-simple-signing';
import { CreatePostRequest } from '@crosspost/types';

// Initialize the NEAR signer
const signer = new NearSigner({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
});

// Connect to NEAR wallet (browser environment)
await signer.connect();

// Initialize the SDK with the NEAR signer
const client = new CrosspostClient({
  baseUrl: 'https://api.crosspost.example',
  auth: {
    type: 'near',
    signer: signer,
  },
});

// Create a post
const request: CreatePostRequest = {
  content: {
    text: 'Hello from Crosspost SDK!',
  },
};

const response = await client.twitter.createPost(request);
console.log(`Post created with ID: ${response.id}`);
```

## Development

### Building

```bash
# Build all packages for Node.js
npm run build:node

# Build packages for Deno
npm run build:deno

# Build all packages for all environments
npm run build:all
```

### Testing

```bash
# Run tests for all packages
npm test

# Run tests for a specific package
npm run test:types
npm run test:near-simple-signing
npm run test:sdk
```

### Linting

```bash
# Lint all packages
npm run lint

# Lint a specific package
npm run lint:types
npm run lint:near-simple-signing
npm run lint:sdk
```

## Publishing

### npm

```bash
# Publish all packages to npm
npm run publish

# Publish a specific package to npm
cd types && npm publish
cd near-simple-signing && npm publish
cd sdk && npm publish
```

### JSR (Deno)

```bash
# Publish to JSR
cd types && deno publish
cd near-simple-signing && deno publish
```

## License

MIT
