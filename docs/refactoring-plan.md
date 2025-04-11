# Refactoring Plan

This document outlines planned refactoring efforts to improve the codebase's structure,
maintainability, and testability.

## 1. Dependency Injection (DI)

**Goal:** Decouple components, improve testability, and clarify dependencies.

**Approach:** Implement constructor injection throughout the application.

**Details:**

- **Controllers (e.g., `AuthController`, `PostController`):**
  - Will receive instances of required **Services** (e.g., `AuthService`, `PostService`) via their
    constructor.
  - Example: `AuthController` will receive `AuthService` and `NearAuthService`.
- **Services (e.g., `AuthService`, `PostService`):**
  - Will receive instances of `Env`, `NearAuthService`, and potentially other services or platform
    implementations.
  - Example: `PostService` will receive `NearAuthService` and platform-specific implementations like
    `TwitterPost`.
- **Platform Implementations (e.g., `TwitterAuth`, `TwitterPost`):**
  - Will receive `Env`, `NearAuthService`, and potentially specific client instances (e.g.,
    `TwitterClient`).
  - Example: `TwitterPost` will receive `Env`, `NearAuthService`, and `TwitterClient`.
- **Infrastructure (`NearAuthService`, `NearAuthService`, `TokenStorage`, `TwitterClient`):**
  - Will receive `Env` and potentially lower-level dependencies (e.g., a KV store wrapper).
  - Example: `NearAuthService` will receive `Env`, `TokenStorage`, and `NearAuthService`.
- **Instantiation:** The main application entry point (`main.ts` or a dedicated setup file) will be
  responsible for creating and wiring together the core dependencies.

**Benefits:**

- **Testability:** Easier to mock dependencies for unit testing.
- **Decoupling:** Reduces tight coupling between classes.
- **Clarity:** Makes dependencies explicit and easier to understand.
- **Flexibility:** Simplifies replacing implementations (e.g., swapping storage mechanisms).

## 2. Consolidate OAuth Initialization Logic

**Goal:** Remove redundancy in OAuth flow initiation and clarify responsibilities.

**Details:**

- The responsibility for generating platform-specific authorization URLs and handling the initial
  OAuth callback should reside solely within the `PlatformAuth` implementations (e.g.,
  `TwitterAuth`).
- Remove the `getAuthUrl` and `exchangeCodeForToken` methods from the `BasePlatformClient` class and
  the `PlatformClient` interface. These methods are already effectively handled within
  `BasePlatformAuth` and its concrete implementations.
- Ensure `AuthService` correctly utilizes the `PlatformAuth` implementation for initiating the OAuth
  flow and handling the callback.

**Benefits:**

- **Clearer Responsibility:** `PlatformAuth` handles authentication initiation; `PlatformClient`
  handles authenticated API calls.
- **Reduced Duplication:** Eliminates redundant method definitions and potential confusion.

## 3. Refine Token Management Logic

**Goal:** Improve clarity and potentially simplify token update/linking logic.

**Details:**

- **Rename `NearAuthService.saveTokens`:** Rename this method to something more descriptive of its
  dual action, such as `updateStoredTokensAndLinks`, to reflect that it saves tokens to
  `TokenStorage` _and_ updates metadata in `NearAuthService`.
- **Review `saveTokens` Interaction:** Carefully review the interaction between
  `NearAuthService.saveTokens` and `NearAuthService`. Ensure the update to `NearAuthService` within
  `saveTokens` is necessary (e.g., for updating metadata on existing links when tokens change) and
  not redundant with the explicit `NearAuthService.linkAccount` call performed during the initial
  callback in `BasePlatformAuth.linkAccountToNear`. Simplify if possible.

**Benefits:**

- **Improved Clarity:** Method names better reflect their actions.
- **Reduced Potential Redundancy:** Ensures linking logic is performed efficiently.

## 4. Generic Refresh Mechanism (Future Enhancement)

**Goal:** Provide a consistent token refresh-and-retry mechanism across all platforms.

**Details:**

- While the current `TwitterClient` leverages the `twitter-api-v2` auto-refresh plugin, other
  platforms might not have equivalent library support.
- Consider adding logic (potentially in `BasePlatformClient` or the service layer) to:
  1. Catch specific authentication errors (e.g., 401) during API calls.
  2. Explicitly call `BasePlatformAuth.refreshToken`.
  3. Retry the original API call once with the new token.
- This can be implemented later as new platforms are added.

**Benefits:**

- **Platform Consistency:** Provides a uniform approach to handling expired tokens.
- **Reliability:** Increases the robustness of API calls for platforms without auto-refreshing
  clients.

## Appendix: Detailed DI Constructor Changes

This section lists the specific constructor changes required for implementing

# Refactoring Plan

This document outlines planned refactoring efforts to improve the codebase's structure,
maintainability, and testability.

## 1. Dependency Injection (DI)

**Goal:** Decouple components, improve testability, and clarify dependencies.

**Approach:** Implement constructor injection throughout the application.

**Details:**

- **Controllers (e.g., `AuthController`, `PostController`):**
  - Will receive instances of required **Services** (e.g., `AuthService`, `PostService`) via their
    constructor.
  - Example: `AuthController` will receive `AuthService` and `NearAuthService`.
- **Services (e.g., `AuthService`, `PostService`):**
  - Will receive instances of `Env`, `NearAuthService`, and potentially other services or platform
    implementations.
  - Example: `PostService` will receive `NearAuthService` and platform-specific implementations like
    `TwitterPost`.
- **Platform Implementations (e.g., `TwitterAuth`, `TwitterPost`):**
  - Will receive `Env`, `NearAuthService`, and potentially specific client instances (e.g.,
    `TwitterClient`).
  - Example: `TwitterPost` will receive `Env`, `NearAuthService`, and `TwitterClient`.
- **Infrastructure (`NearAuthService`, `NearAuthService`, `TokenStorage`, `TwitterClient`):**
  - Will receive `Env` and potentially lower-level dependencies (e.g., a KV store wrapper).
  - Example: `NearAuthService` will receive `Env`, `TokenStorage`, and `NearAuthService`.
- **Instantiation:** The main application entry point (`main.ts` or a dedicated setup file) will be
  responsible for creating and wiring together the core dependencies.

**Benefits:**

- **Testability:** Easier to mock dependencies for unit testing.
- **Decoupling:** Reduces tight coupling between classes.
- **Clarity:** Makes dependencies explicit and easier to understand.
- **Flexibility:** Simplifies replacing implementations (e.g., swapping storage mechanisms).

## 2. Consolidate OAuth Initialization Logic

**Goal:** Remove redundancy in OAuth flow initiation and clarify responsibilities.

**Details:**

- The responsibility for generating platform-specific authorization URLs and handling the initial
  OAuth callback should reside solely within the `PlatformAuth` implementations (e.g.,
  `TwitterAuth`).
- Remove the `getAuthUrl` and `exchangeCodeForToken` methods from the `BasePlatformClient` class and
  the `PlatformClient` interface. These methods are already effectively handled within
  `BasePlatformAuth` and its concrete implementations.
- Ensure `AuthService` correctly utilizes the `PlatformAuth` implementation for initiating the OAuth
  flow and handling the callback.

**Benefits:**

- **Clearer Responsibility:** `PlatformAuth` handles authentication initiation; `PlatformClient`
  handles authenticated API calls.
- **Reduced Duplication:** Eliminates redundant method definitions and potential confusion.

## 3. Refine Token Management Logic

**Goal:** Improve clarity and potentially simplify token update/linking logic.

**Details:**

- **Rename `NearAuthService.saveTokens`:** Rename this method to something more descriptive of its
  dual action, such as `updateStoredTokensAndLinks`, to reflect that it saves tokens to
  `TokenStorage` _and_ updates metadata in `NearAuthService`.
- **Review `saveTokens` Interaction:** Carefully review the interaction between
  `NearAuthService.saveTokens` and `NearAuthService`. Ensure the update to `NearAuthService` within
  `saveTokens` is necessary (e.g., for updating metadata on existing links when tokens change) and
  not redundant with the explicit `NearAuthService.linkAccount` call performed during the initial
  callback in `BasePlatformAuth.linkAccountToNear`. Simplify if possible.

**Benefits:**

- **Improved Clarity:** Method names better reflect their actions.
- **Reduced Potential Redundancy:** Ensures linking logic is performed efficiently.

## 4. Generic Refresh Mechanism (Future Enhancement)

**Goal:** Provide a consistent token refresh-and-retry mechanism across all platforms.

**Details:**

- While the current `TwitterClient` leverages the `twitter-api-v2` auto-refresh plugin, other
  platforms might not have equivalent library support.
- Consider adding logic (potentially in `BasePlatformClient` or the service layer) to:
  1. Catch specific authentication errors (e.g., 401) during API calls.
  2. Explicitly call `BasePlatformAuth.refreshToken`.
  3. Retry the original API call once with the new token.
- This can be implemented later as new platforms are added.

**Benefits:**

- **Platform Consistency:** Provides a uniform approach to handling expired tokens.
- **Reliability:** Increases the robustness of API calls for platforms without auto-refreshing
  clients.

## 5. Remove Unused Code

**Goal:** Clean up the codebase by removing identified unused exports.

**Details:** (Requires confirmation via search before removal)

- **`src/utils/spam-detection.utils.ts`:** Functions `addContentVariation` and `getPostDelay` appear
  unused.
- **`src/infrastructure/security/token-access-logger.ts`:** The `TokenAccessLogger` class appears
  unused.
- **`src/infrastructure/storage/user-profile-storage.ts`:** The `UserProfileStorage` class appears
  unused (profile handling seems integrated into `TwitterProfile`).
- **Config Exports:** Investigate potentially unused exports in `src/config/` (`getAllowedOrigins`,
  `isDevelopment`, `getSecureEnv`, `DEFAULT_CONFIG`). Verify their usage before removal.

**Benefits:**

- **Reduced Code Size:** Smaller, cleaner codebase.
- **Improved Maintainability:** Less code to understand and maintain.
