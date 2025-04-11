# Open Crosspost Proxy Service: SDK Architecture

## Overview

The SDK architecture provides a modular, type-safe way to interact with the Open Crosspost Proxy
Service. It consists of three core packages that work together to provide a seamless development
experience.

```mermaid
flowchart TD
    Client[Client Application] --> SDK[SDK Package]
    SDK --> Types[Types Package]
    SDK --> Signing[NEAR Signing Package]
    
    subgraph "SDK Components"
        Types -- "Type Definitions" --> SDK
        Signing -- "Auth Signatures" --> SDK
        SDK -- "API Requests" --> Service[Proxy Service]
    end
```

## Core Packages

### 1. @crosspost/types

The foundation package providing shared type definitions and validation schemas.

```mermaid
classDiagram
    class Types {
        +auth: AuthTypes
        +post: PostTypes
        +media: MediaTypes
        +errors: ErrorTypes
        +response: ResponseTypes
    }
    
    class Schemas {
        +AuthSchema
        +PostSchema
        +MediaSchema
        +ErrorSchema
        +ResponseSchema
    }
    
    Types --> Schemas : derives from
```

**Key Features:**

- TypeScript interfaces for all API types
- Zod schemas for runtime validation
- Error type definitions
- Platform-agnostic design
- Zero runtime dependencies

### 2. @crosspost/near-simple-signing

Handles NEAR wallet signature generation for authentication.

```mermaid
classDiagram
    class NearSigner {
        +connect()
        +sign(message: string)
        +verify(signature: string)
        +createAuthHeader()
    }
    
    class WalletConnection {
        +networkId: string
        +nodeUrl: string
        +walletUrl: string
    }
    
    NearSigner --> WalletConnection
```

**Key Features:**

- NEAR wallet connection
- Signature generation
- Authentication headers
- Browser and Node.js support

### 3. @crosspost/sdk

Main client SDK for interacting with the proxy service.

```mermaid
classDiagram
    class CrosspostClient {
        +twitter: TwitterClient
        +auth: AuthProvider
        +initialize()
        +connect()
    }
    
    class PlatformClient {
        <<interface>>
        +createPost()
        +deletePost()
        +like()
        +repost()
    }
    
    class AuthProvider {
        <<interface>>
        +getAuthHeader()
        +isAuthenticated()
    }
    
    CrosspostClient --> PlatformClient
    CrosspostClient --> AuthProvider
```

**Key Features:**

- Platform-specific clients
- Flexible authentication
- Type-safe operations
- Error handling
- Request/response validation

## Integration Flow

```typescript
import { CrosspostClient } from '@crosspost/sdk';
import { NearSigner } from '@crosspost/near-simple-signing';

// Initialize NEAR signer
const signer = new NearSigner({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
});

// Create and initialize client
const client = new CrosspostClient({
  baseUrl: 'https://api.crosspost.example',
  auth: {
    type: 'near',
    signer,
  },
});

// Use platform-specific client
const post = await client.twitter.createPost({
  content: { text: 'Hello from Crosspost!' },
});
```

## Architecture Benefits

1. **Type Safety**
   - Full TypeScript support
   - Runtime validation
   - Compile-time checks

2. **Modularity**
   - Independent packages
   - Clear responsibilities
   - Flexible integration

3. **Developer Experience**
   - Intuitive API design
   - Comprehensive documentation
   - Consistent patterns

4. **Maintainability**
   - Decoupled components
   - Platform abstraction
   - Centralized types

## Future Enhancements

1. **Additional Platforms**
   - Platform-specific clients
   - Custom functionality
   - Extended capabilities

2. **Enhanced Security**
   - Key rotation support
   - Token management
   - Access controls

3. **Performance Optimization**
   - Request batching
   - Caching strategies
   - Rate limit handling
