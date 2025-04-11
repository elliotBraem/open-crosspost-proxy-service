# Social Media API Proxy System Patterns

## Core Architecture

The Open Crosspost Proxy Service uses a layered architecture with clear separation of concerns,
enabling platform-agnostic design and extensibility.

```mermaid
flowchart TD
    Client[Client Applications] --> API[API Layer]
    API --> Controllers[Controllers]
    Controllers --> Services[Domain Services]
    Services --> PlatformAbstraction[Platform Abstraction]
    
    PlatformAbstraction --> Auth[PlatformAuth]
    PlatformAbstraction --> Client[PlatformClient]
    PlatformAbstraction --> Post[PlatformPost]
    PlatformAbstraction --> Media[PlatformMedia]
    PlatformAbstraction --> Profile[PlatformProfile]
    
    Services --> Security[Security Services]
    Security --> NearAuth[NEAR Auth Service]
    Security --> TokenStorage[Token Storage]
    
    Services --> Storage[Storage Services]
    Storage --> KVStore[KV Store Utilities]
```

## Key Design Patterns

### 1. Platform Abstraction Pattern

The platform abstraction layer separates core proxy functionality from platform-specific
implementations, allowing easy extension to other social media platforms.

Each platform interface has a specific responsibility:

- **PlatformAuth**: Handles authentication flows
- **PlatformClient**: Manages API client instances
- **PlatformPost**: Handles post creation and management
- **PlatformMedia**: Manages media uploads and attachments
- **PlatformProfile**: Manages user profile operations

### 2. NEAR-Centric Authentication Pattern

The system uses NEAR wallet signatures for authentication, providing a secure way to authorize
actions without exposing OAuth tokens to clients.

```mermaid
sequenceDiagram
    participant Client
    participant NearWallet
    participant Proxy
    participant TokenStorage
    participant Platform
    
    Client->>NearWallet: Request Signature
    NearWallet->>Client: Return Signed Message
    Client->>Proxy: Send Signature + Request
    Proxy->>Proxy: Validate Signature
    Proxy->>Proxy: Check Account Authorization
    alt Authorized
      Proxy->>TokenStorage: Retrieve Platform Token
      Proxy->>Platform: Execute Action with Token
      Platform->>Proxy: Return Result
    else Not Authorized
      Proxy->>Client: Return 403 Error
    end
    Proxy->>Client: Return Result
```

Benefits:

- Secure authentication without exposing OAuth tokens
- Multiple platform accounts linked to a single NEAR wallet
- Cross-platform actions authorized by a single signature
- Decentralized identity management

### 3. Token Management Pattern

The system implements a centralized token management approach where platform tokens are stored
securely and accessed via a central `NearAuthService`.

Key components:

- **NearAuthService**: Central coordinator for token operations
- **TokenStorage**: Securely stores encrypted platform tokens
- **NearAuthService**: Manages NEAR account authorization and platform account linking

### 4. Centralized Schema and Type Pattern

The system uses a single source of truth for both TypeScript types and Zod schemas, with TypeScript
types derived from Zod schemas.

```mermaid
flowchart TD
    Schema[Zod Schema] --> DerivedType[TypeScript Type]
    Schema --> Validation[Request Validation]
    DerivedType --> TypeChecking[Static Type Checking]
    DerivedType --> SDK[SDK Type Safety]
    
    subgraph "Types Package"
        Schema
        DerivedType
    end
```

Benefits:

- Consistency between validation and type checking
- Reduced maintenance overhead
- Improved developer experience
- Better type safety across the codebase

### 5. Base Platform Classes Pattern

Base platform classes provide common functionality for platform-specific implementations, reducing
code duplication and ensuring consistent behavior.

Components:

- **BasePlatformClient**: Base implementation of PlatformClient interface
- **BasePlatformAuth**: Base implementation of PlatformAuth interface
- **Common error handling**: Standardized error handling for all platform operations

### 6. KV Utility Pattern

Standardized interfaces for interacting with Deno KV, with error handling, prefixed keys, and
transaction support.

Components:

- **KvStore**: Static utility class for direct KV operations
- **PrefixedKvStore**: Instance-based utility for working with prefixed keys

## Authentication Flow

```mermaid
sequenceDiagram
    participant ClientApp
    participant NearWallet
    participant ProxyService
    participant TokenStorage
    participant NearAuthSvc
    participant PlatformAPI

    %% Step 1: NEAR Authorization %%
    ClientApp->>NearWallet: Request signature
    NearWallet-->>ClientApp: Return signed message
    ClientApp->>ProxyService: POST /auth/authorize/near
    ProxyService->>NearAuthSvc: Authorize NEAR account
    NearAuthSvc-->>ProxyService: Success
    ProxyService-->>ClientApp: 200 OK

    %% Step 2: Platform Account Linking %%
    ClientApp->>ProxyService: POST /auth/{platform}/login
    ProxyService->>NearAuthSvc: Check authorization status
    ProxyService->>NearAuthSvc: Store auth state
    ProxyService-->>ClientApp: Return auth URL

    %% Step 3: Platform OAuth %%
    ClientApp->>PlatformAPI: Redirect to auth URL
    PlatformAPI->>ProxyService: Callback with code & state
    ProxyService->>PlatformAPI: Exchange code for tokens
    ProxyService->>TokenStorage: Securely store tokens
    ProxyService->>NearAuthSvc: Link platform account to NEAR account
    ProxyService-->>ClientApp: Redirect to success URL
```

## Error Handling Pattern

The system uses a standardized error handling approach with consistent error types, status codes,
and response formats.

```mermaid
flowchart TD
    Error[Error Occurs] --> Classify{Classify Error}
    Classify -->|Auth Error| HandleAuth[Refresh or Revoke Token]
    Classify -->|Rate Limit| HandleRate[Apply Backoff Strategy]
    Classify -->|Platform API| HandlePlatform[Retry or Fail Gracefully]
    Classify -->|Validation| HandleValidation[Return Validation Details]
    Classify -->|Internal| HandleInternal[Log and Alert]
    
    HandleAuth --> StandardResponse[Return Standardized Error Response]
    HandleRate --> StandardResponse
    HandlePlatform --> StandardResponse
    HandleValidation --> StandardResponse
    HandleInternal --> StandardResponse
```

Key components:

- **ApiError**: For application-level errors with code, status, details, and recoverable flag
- **PlatformError**: For platform-specific errors with original error details
- **Standardized status codes**: Consistent mapping from error codes to HTTP status codes
- **Detailed error responses**: Rich error details for better client feedback
