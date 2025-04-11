# Authentication and API Call Flows

This document outlines the key sequence of events for user authentication, platform account linking,
and subsequent API calls within the Social Media API Proxy.

## Flow 1: Initial NEAR Account Authorization & Platform Account Linking

This flow describes how a user authorizes their NEAR account with the proxy and then links a
specific social media platform account (e.g., Twitter) to it.

```mermaid
sequenceDiagram
    participant ClientApp as Client Application
    participant ProxyAPI as Proxy API Endpoint
    participant AuthCtrl as AuthController
    participant AuthSvc as AuthService
    participant PlatformAuth as PlatformAuth Impl (e.g., TwitterAuth)
    participant TokenMgr as NearAuthService
    participant NearAuthSvc as NearAuthService (via TokenMgr)
    participant TokenStore as TokenStorage (via TokenMgr)
    participant PlatformOAuth as Platform OAuth Provider

    %% Step 1: Authorize NEAR Account %%
    ClientApp->>ProxyAPI: POST /auth/authorize/near (with NEAR Sig)
    ProxyAPI->>AuthCtrl: authorizeNear(c)
    AuthCtrl->>TokenMgr: authorizeNearAccount(signerId)
    TokenMgr->>NearAuthSvc: authorizeNearAccount(signerId)
    NearAuthSvc-->>TokenMgr: Success
    TokenMgr-->>AuthCtrl: Success
    AuthCtrl-->>ProxyAPI: 200 OK Response
    ProxyAPI-->>ClientApp: Success

    %% Step 2: Initiate Platform Linking %%
    ClientApp->>ProxyAPI: POST /auth/{platform}/login (with NEAR Sig, successUrl, errorUrl)
    ProxyAPI->>AuthCtrl: initializeAuth(c, platform)
    AuthCtrl->>AuthCtrl: Validate NEAR Sig & Check Auth Status (via TokenMgr)
    alt NEAR Account Authorized
        AuthCtrl->>AuthSvc: initializeAuth(platform, signerId, callbackUrl, scopes, successUrl, errorUrl)
        AuthSvc->>PlatformAuth: initializeAuth(callbackUrl, scopes)
        PlatformAuth-->>AuthSvc: {authUrl, state, codeVerifier}
        AuthSvc->>TokenMgr: Store AuthState(state, signerId, successUrl, errorUrl, ...) in KV
        AuthSvc-->>AuthCtrl: {authUrl, state}
        AuthCtrl-->>ProxyAPI: 200 OK Response {authUrl, state}
        ProxyAPI-->>ClientApp: {authUrl, state}
    else NEAR Account Not Authorized
        AuthCtrl-->>ProxyAPI: 403 Forbidden Response
        ProxyAPI-->>ClientApp: 403 Forbidden
    end

    %% Step 3: User Authorizes on Platform %%
    ClientApp->>PlatformOAuth: Redirect User to authUrl
    PlatformOAuth-->>ClientApp: User Grants Access on Platform Site
    Note over PlatformOAuth, ClientApp: Platform redirects user back to Proxy callback

    %% Step 4: Handle Platform Callback & Link Account %%
    ClientApp->>ProxyAPI: GET /auth/{platform}/callback?code=...&state=...
    ProxyAPI->>AuthCtrl: handleCallback(c, platform)
    AuthCtrl->>AuthSvc: handleCallback(platform, code, state)
    AuthSvc->>TokenMgr: Retrieve AuthState(state) -> {signerId, successUrl, errorUrl, codeVerifier}
    AuthSvc->>PlatformAuth: exchangeCodeForTokens(code, callbackUrl, codeVerifier)
    PlatformAuth-->>AuthSvc: {userId, token}
    AuthSvc->>TokenMgr: saveTokens(userId, platform, token)
    TokenMgr->>TokenStore: Encrypt and Save Token
    AuthSvc->>TokenMgr: linkAccount(signerId, platform, userId)
    TokenMgr->>NearAuthSvc: Store Link(signerId, platform, userId)
    AuthSvc->>TokenMgr: Delete AuthState(state) from KV
    AuthSvc-->>AuthCtrl: {userId, successUrl}
    AuthCtrl-->>ProxyAPI: 302 Redirect Response (to successUrl)
    ProxyAPI->>ClientApp: Redirect to successUrl?userId=...&platform=...&success=true
```

**Description:**

1. **NEAR Authorization:** The client first authorizes their NEAR account (`signerId`) with the
   proxy by sending a signed message. `NearAuthService` (via `NearAuthService`) records this
   authorization.
2. **Initiate Linking:** The client requests to link a platform account, providing their NEAR
   signature and desired redirect URLs (`successUrl`, `errorUrl`). The proxy validates the
   signature, checks if the NEAR account is authorized, and then asks the `AuthService` to begin the
   platform's OAuth flow.
3. **Platform OAuth:** `AuthService` gets the platform-specific `PlatformAuth` implementation, calls
   its `initializeAuth` method to get the platform's authorization URL, `state`, and PKCE
   `codeVerifier`. This state information (including the original `signerId` and redirect URLs) is
   temporarily stored in KV by `NearAuthService`, keyed by the `state`. The proxy returns the
   platform's URL to the client.
4. **User Grant:** The client redirects the user to the platform. The user logs in and grants the
   requested permissions.
5. **Callback Handling:** The platform redirects the user back to the proxy's callback URL with an
   authorization `code` and the original `state`.
6. **Token Exchange & Linking:** The proxy's `AuthController` passes the `code` and `state` to
   `AuthService`. `AuthService` retrieves the stored state (including `signerId`, `successUrl`,
   `codeVerifier`) from KV using the `state` parameter. It then calls the platform-specific
   `PlatformAuth.exchangeCodeForTokens` method. Upon successful exchange, `AuthService` uses
   `NearAuthService` to securely save the obtained tokens (via `TokenStorage`) and link the platform
   `userId` to the original `signerId` (via `NearAuthService`). The temporary state is deleted from
   KV.
7. **Client Redirect:** The proxy redirects the client application to the original `successUrl`,
   often appending details like the `userId` and `platform`.

---

## Flow 2: Subsequent API Calls (e.g., Creating a Post)

This flow describes how an authorized client application makes API calls (like creating a post) on
behalf of the user using their NEAR signature.

```mermaid
sequenceDiagram
    participant ClientApp as Client Application
    participant ProxyAPI as Proxy API Endpoint
    participant AuthMW as AuthMiddleware
    participant NearAuthUtil as near-auth.utils
    participant Controller as API Controller (e.g., PostController)
    participant Service as Domain Service (e.g., PostService)
    participant TokenMgr as NearAuthService
    participant NearAuthSvc as NearAuthService (via TokenMgr)
    participant TokenStore as TokenStorage (via TokenMgr)
    participant PlatformImpl as Platform Impl (e.g., TwitterPost)
    participant PlatformClient as Platform Client (e.g., TwitterClient)
    participant ExternalAPI as External Platform API

    %% Step 1: Client Prepares and Signs Request %%
    ClientApp->>ClientApp: Prepare API Request Data (e.g., post content)
    ClientApp->>ClientApp: Generate NEAR Signature for Request Details
    ClientApp->>ProxyAPI: API Request (e.g., POST /api/post) with Data + Auth Header (Bearer JSON)

    %% Step 2: Proxy Validates NEAR Signature & Authorization %%
    ProxyAPI->>AuthMW: Intercept Request
    AuthMW->>NearAuthUtil: extractAndValidateNearAuth(header)
    NearAuthUtil->>NearAuthUtil: Parse Header, Validate Signature
    NearAuthUtil->>TokenMgr: getNearAuthorizationStatus(signerId)
    TokenMgr->>NearAuthSvc: isNearAccountAuthorized(signerId)
    NearAuthSvc-->>TokenMgr: true
    TokenMgr-->>NearAuthUtil: Authorized (status >= 0)
    NearAuthUtil-->>AuthMW: {signerId}
    AuthMW->>AuthMW: Add signerId to Request Context
    AuthMW->>Controller: Forward Request

    %% Step 3: Controller Delegates to Service %%
    Controller->>Controller: Get signerId from Context
    Controller->>Controller: Extract Platform/User Info from Request
    Controller->>Service: Call Service Method (signerId, platform, userId, requestData)

    %% Step 4: Service Retrieves Tokens and Calls Platform Implementation %%
    Service->>TokenMgr: getTokens(userId, platform)
    TokenMgr->>TokenStore: Retrieve Encrypted Token
    TokenStore-->>TokenMgr: Encrypted Token
    TokenMgr->>TokenMgr: Decrypt Token
    alt Token Expired and Refreshable
        TokenMgr-->>Service: Expired Token (with refreshToken)
        Note over Service: Service/PlatformImpl handles refresh implicitly or explicitly
        Service->>PlatformImpl: Call Platform Method (userId, requestData)
        PlatformImpl->>PlatformClient: getClientForUser(userId)
        PlatformClient->>TokenMgr: getTokens(userId, platform) ;; Gets expired token again
        PlatformClient->>PlatformClient: Instantiate API Client with Auto-Refresher Plugin
        PlatformClient->>ExternalAPI: Make API Call (Fails with 401)
        PlatformClient->>PlatformClient: Auto-Refresher Plugin Triggered
        PlatformClient->>ExternalAPI: Refresh Token Request
        ExternalAPI-->>PlatformClient: New Tokens
        PlatformClient->>TokenMgr: onTokenUpdate Callback -> saveTokens(userId, platform, newTokens)
        TokenMgr->>TokenStore: Save New Encrypted Token
        PlatformClient->>ExternalAPI: Retry Original API Call (with new token)
        ExternalAPI-->>PlatformClient: Success Response
        PlatformClient-->>PlatformImpl: Success Response
    else Token Valid or Not Refreshable
        TokenMgr-->>Service: Valid Token (or error if expired & not refreshable)
        Service->>PlatformImpl: Call Platform Method (userId, requestData)
        PlatformImpl->>PlatformClient: getClientForUser(userId)
        PlatformClient->>TokenMgr: getTokens(userId, platform) ;; Gets valid token
        PlatformClient->>PlatformClient: Instantiate API Client
        PlatformClient->>ExternalAPI: Make API Call
        ExternalAPI-->>PlatformClient: Success/Error Response
        PlatformClient-->>PlatformImpl: Success/Error Response
    end
    PlatformImpl-->>Service: Result/Error
    Service-->>Controller: Result/Error

    %% Step 5: Proxy Returns Response %%
    Controller-->>ProxyAPI: Format Response
    ProxyAPI-->>ClientApp: Send HTTP Response
```

**Description:**

1. **Client Request:** The client prepares the request data and uses the user's NEAR wallet to sign
   relevant details (e.g., timestamp, nonce, recipient). The signature and related data are sent in
   the `Authorization: Bearer <JSON_Payload>` header.
2. **Signature Validation:** The `AuthMiddleware` intercepts the request. It uses
   `near-auth.utils.extractAndValidateNearAuth` to parse the header, validate the cryptographic
   signature against the provided public key and message components, and check if the derived
   `signerId` is authorized using `NearAuthService.getNearAuthorizationStatus`.
3. **Context Update:** If validation and authorization succeed, the `signerId` is added to the
   request context.
4. **Controller Logic:** The request proceeds to the appropriate API controller (e.g.,
   `PostController`). The controller retrieves the `signerId` from the context and extracts
   necessary parameters (like target `platform`, `userId`, post `content`) from the request body or
   path.
5. **Service Delegation:** The controller calls the relevant domain service method (e.g.,
   `PostService.createPost`), passing the `signerId`, platform/user identifiers, and request data.
6. **Token Retrieval:** The service uses the `userId` and `platform` to request the necessary
   `AuthToken` from `NearAuthService`. `NearAuthService` retrieves the encrypted token from
   `TokenStorage` and decrypts it.
7. **Platform Interaction:** The service calls the appropriate method on the platform-specific
   implementation (e.g., `TwitterPost.createPost`).
8. **Client Instantiation & Refresh:** The platform implementation (`TwitterPost`) typically gets an
   authenticated client instance from its corresponding `PlatformClient` (`TwitterClient`).
   `TwitterClient.getClientForUser` retrieves the token again via `NearAuthService` and instantiates
   the underlying API library client (e.g., `TwitterApi`).
   - **Auto-Refresh (Twitter Example):** If using the `TwitterApiAutoTokenRefresher`, an initial API
     call might fail with a 401 if the token is expired. The plugin automatically attempts to
     refresh the token using the stored refresh token. If successful, its `onTokenUpdate` callback
     notifies `NearAuthService` to save the new token, and the original API call is retried. If
     refresh fails (e.g., invalid refresh token), `onTokenRefreshError` notifies `NearAuthService`
     to delete the token, and an error is propagated back.
   - **Manual Refresh (Alternative):** If not using an auto-refresher, the platform implementation
     would need to catch the 401 error, explicitly call `BasePlatformAuth.refreshToken`, and then
     retry the API call with the new token.
9. **API Call:** The authenticated platform client makes the actual call to the external social
   media API.
10. **Response Handling:** The result (success or error) is propagated back through the layers
    (Platform Implementation -> Service -> Controller -> Client).
