# Social Media API Proxy Active Context

## Current Work Focus

We are preparing for the v1 release of the Twitter API Proxy. The focus is on ensuring the core functionality is stable and well-documented, with particular attention to post dynamics and token management.

### Types and Schemas

We've implemented a centralized approach for type safety and validation:

1. **Zod Schemas**: Defined in the `packages/types/src` directory, these provide runtime validation of API requests and responses.
2. **TypeScript Types**: Derived from Zod schemas using `z.infer<typeof schemaName>`, these provide static type checking during development.

This approach ensures that types and schemas are always in sync, as the TypeScript types are derived directly from the Zod schemas.

### Platform Abstraction

The platform abstraction layer separates core proxy functionality from platform-specific implementations:

- **PlatformAuth**: Handles authentication flows
- **PlatformClient**: Manages API client instances
- **PlatformPost**: Handles post creation and management
- **PlatformMedia**: Manages media uploads and attachments
- **PlatformProfile**: Manages user profile operations

This design allows for easy extension to other social media platforms beyond Twitter.

### NEAR Wallet Integration

The NEAR wallet integration provides a secure way to authenticate users:

- **NearSigner**: Generates and validates NEAR wallet signatures
- **NearAuthService**: Manages NEAR account authorization and token storage
- **Account Linking**: Links NEAR wallets to social media accounts

## Active Decisions

1. **Post Dynamics Improvements**: 🔄 IN PROGRESS
   - Enhancing error handling for post operations
   - Improving media attachment handling
   - Optimizing thread creation
   - Ensuring consistent response formats

2. **Token Management Enhancements**: 🔄 IN PROGRESS
   - ✅ Implemented NEAR-centric token management approach
   - ✅ Centralized token access through AuthService
   - ✅ Added token refresh callback mechanism in BasePlatformClient
   - ✅ Removed duplicate token storage in platform-specific implementations
   - ✅ Standardized auth state handling across the codebase
   - ✅ Improved abstraction in BasePlatformAuth for OAuth callback handling
   - 🔄 Improving error recovery for token operations
   - 🔄 Enhancing token expiry management

3. **SDK Refinement**: ✅ COMPLETED
   - Created modular SDK architecture
   - Implemented shared type definitions
   - Developed NEAR signature generation utilities
   - Built platform-specific clients

## Next Steps

1. **Post Dynamics Fixes**:
   - Complete error handling improvements
   - Enhance media attachment process
   - Optimize thread creation
   - Implement consistent response formats

2. **Token Management**:
   - Enhance token refresh mechanisms
   - Improve error recovery for token operations
   - Implement token expiry management

3. **Error Handling Consolidation**: 🔄 IN PROGRESS
   - Consolidating around `@crosspost/types` error system
   - Removed `PlatformErrorType` enum and replaced with `ApiErrorCode`
   - Updated `PlatformError` constructor calls to use new signature
   - Fixed type issues with `StatusCode` in controllers and middleware
   - Still need to address remaining TypeScript errors in auth middleware, usage rate limit middleware, and near-auth utils

4. **Testing Framework**: 🔄 IN PROGRESS
   - Defined comprehensive testing strategy with focus on simplicity and error propagation
   - Created and refined Twitter API mock implementation based on node-twitter-v2 docs
   - Implemented proper mocking strategies using Deno's `@std/testing/mock` utilities:
     - Using `stub` function to mock module functions with proper signature matching
     - Using the `using` keyword for automatic cleanup of stubs
     - Created mock module implementations for ES modules with read-only exports
     - Documented best practices for mocking in the testing-strategy.md file
   - Successfully implemented post creation controller tests with mocked dependencies
   - Current focus:
     - Service testing: HTTP-based tests for service endpoints using mock Twitter API
     - SDK testing: Testing SDK against mock service responses
     - Error propagation: Ensuring errors are properly propagated from Twitter API to SDK
   - Next steps:
     - Implement service tests for authentication, post operations, and rate limiting
     - Implement SDK tests for client methods and error handling
     - Create necessary test utilities and helpers

5. **Documentation**:
   - Update API documentation
   - Create comprehensive SDK usage examples
   - Document the consolidated error handling strategy

## Current Challenges

1. **Post Dynamics Edge Cases**:
   - Handling rate limiting during high-volume posting
   - Managing media upload failures gracefully
   - Ensuring consistent behavior across different post types

2. **Token Management Reliability**:
   - Handling token refresh failures
   - Managing expired tokens
   - Recovering from authentication errors

3. **Testing Infrastructure**:
   - Setting up comprehensive testing framework
   - Creating test fixtures and helpers
   - Mocking external dependencies

4. **TypeScript Errors & Error Handling**: 🔄 IN PROGRESS
   - Made significant progress on consolidating error systems around `@crosspost/types`
   - Fixed several TypeScript errors related to error handling
   - Remaining issues include:
     - String literals being used where `ApiErrorCode` enum values are expected
     - `ErrorType` references that need to be replaced with `ApiErrorCode`
     - Build errors in Deno distribution files related to importing from `hono/utils/http-status`
