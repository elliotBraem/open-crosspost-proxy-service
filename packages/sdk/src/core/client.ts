import { StatusCode } from 'hono/utils/http-status';
/**
 * Main client for the Crosspost SDK
 */

import {
  // Error Types
  ApiError,
  ApiErrorCode,
  AuthRevokeResponse,
  // Auth Types
  AuthStatusResponse,
  ConnectedAccountsResponse,
  // Post Types
  CreatePostRequest,
  CreatePostResponse,
  DeletePostRequest,
  DeletePostResponse,
  EnhancedApiResponse,
  LikePostRequest,
  LikePostResponse,
  NearAuthorizationResponse,
  // Common Types
  Platform,
  PlatformError,
  QuotePostRequest,
  QuotePostResponse,
  ReplyToPostRequest,
  ReplyToPostResponse,
  RepostRequest,
  RepostResponse,
  UnlikePostRequest,
  UnlikePostResponse,
} from '@crosspost/types';

// Import NearAuthData from the signing package
// import { NearAuthData } from '@crosspost/near-simple-signing';

export interface NearAuthData {
  /**
   * NEAR account ID
   */
  account_id: string;

  /**
   * Public key used for signing
   */
  public_key: string;

  /**
   * Signature of the message
   */
  signature: string;

  /**
   * Message that was signed
   */
  message: string;

  /**
   * Nonce used for signing
   */
  nonce: string;

  /**
   * Recipient of the message
   */
  recipient?: string;

  /**
   * Callback URL
   */
  callback_url?: string;
}

/**
 * Configuration options for the CrosspostClient
 */
export interface CrosspostClientConfig {
  /**
   * Base URL for the Crosspost API
   * @default 'https://api.opencrosspost.com'
   */
  baseUrl?: string;
  /**
   * NEAR authentication data obtained from @crosspost/near-simple-signing (TODO)
   */
  nearAuthData?: NearAuthData;
  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
  /**
   * Number of retries for failed requests (specifically for network errors or 5xx status codes)
   * @default 2
   */
  retries?: number;
}

/**
 * Main client for interacting with the Crosspost API service.
 */
export class CrosspostClient {
  private readonly baseUrl: string;
  private readonly nearAuthData: NearAuthData;
  private readonly timeout: number;
  private readonly retries: number;

  /**
   * Creates an instance of CrosspostClient.
   * @param config Configuration options for the client.
   */
  constructor(config: CrosspostClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://open-crosspost-proxy.deno.dev/';
    this.nearAuthData = config.nearAuthData || {} as NearAuthData;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries ?? 2; // Default to 2 retries if undefined
  }

  // --- NEAR Authorization ---
  /**
   * Authorizes the NEAR account associated with the provided nearAuthData with the Crosspost service.
   * @returns A promise resolving with the authorization response.
   */
  async authorizeNearAccount(): Promise<NearAuthorizationResponse> {
    return this.request('POST', '/auth/authorize/near', {});
  }

  /**
   * Checks the authorization status of the NEAR account with the Crosspost service.
   * @returns A promise resolving with the authorization status response.
   */
  async getNearAuthorizationStatus(): Promise<NearAuthorizationResponse> {
    return this.request('GET', '/auth/authorize/near/status');
  }

  // --- Platform Auth Operations ---
  /**
   * Initiates the login process for a specific platform.
   * The service handles the OAuth flow; this method triggers it.
   * @param platform The target platform.
   * @param options Optional success and error redirect URLs.
   * @returns A promise resolving with the response from the service (might indicate success/failure or redirect info).
   */
  async loginToPlatform(
    platform: Platform,
    options?: { successUrl?: string; errorUrl?: string },
  ): Promise<EnhancedApiResponse<any>> { // TODO: Refine response type based on actual API
    return this.request('POST', `/auth/${platform}/login`, options || {});
  }

  /**
   * Refreshes the authentication token for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the refresh response.
   */
  async refreshToken(platform: Platform): Promise<EnhancedApiResponse<any>> { // TODO: Refine response type
    return this.request('POST', `/auth/${platform}/refresh`);
  }

  /**
   * Refreshes the user's profile information from the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the profile refresh response.
   */
  async refreshProfile(platform: Platform): Promise<EnhancedApiResponse<any>> { // TODO: Refine response type
    return this.request('POST', `/auth/${platform}/refresh-profile`);
  }

  /**
   * Gets the authentication status for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the authentication status response.
   */
  async getAuthStatus(platform: Platform): Promise<AuthStatusResponse> {
    return this.request('GET', `/auth/${platform}/status`);
  }

  /**
   * Revokes the authentication token for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the revocation response.
   */
  async revokeAuth(platform: Platform): Promise<AuthRevokeResponse> {
    return this.request('DELETE', `/auth/${platform}/revoke`);
  }

  /**
   * Lists all accounts connected to the NEAR account.
   * @returns A promise resolving with the list of connected accounts.
   */
  async getConnectedAccounts(): Promise<ConnectedAccountsResponse> {
    return this.request('GET', '/auth/accounts');
  }

  // --- Post Operations ---
  /**
   * Creates a new post on the specified target platforms.
   * @param request The post creation request details.
   * @returns A promise resolving with the post creation response.
   */
  async createPost(request: CreatePostRequest): Promise<CreatePostResponse> {
    return this.request('POST', '/api/post', request);
  }

  /**
   * Reposts an existing post on the specified target platforms.
   * @param request The repost request details.
   * @returns A promise resolving with the repost response.
   */
  async repost(request: RepostRequest): Promise<RepostResponse> {
    return this.request('POST', '/api/post/repost', request);
  }

  /**
   * Quotes an existing post on the specified target platforms.
   * @param request The quote post request details.
   * @returns A promise resolving with the quote post response.
   */
  async quotePost(request: QuotePostRequest): Promise<QuotePostResponse> {
    return this.request('POST', '/api/post/quote', request);
  }

  /**
   * Replies to an existing post on the specified target platforms.
   * @param request The reply request details.
   * @returns A promise resolving with the reply response.
   */
  async replyToPost(request: ReplyToPostRequest): Promise<ReplyToPostResponse> {
    return this.request('POST', '/api/post/reply', request);
  }

  /**
   * Likes a post on the specified target platforms.
   * @param request The like request details.
   * @returns A promise resolving with the like response.
   */
  async likePost(request: LikePostRequest): Promise<LikePostResponse> {
    // API endpoint uses postId in the path
    return this.request('POST', `/api/post/like/${request.postId}`, request);
  }

  /**
   * Unlikes a post on the specified target platforms.
   * @param request The unlike request details.
   * @returns A promise resolving with the unlike response.
   */
  async unlikePost(request: UnlikePostRequest): Promise<UnlikePostResponse> {
    // API endpoint uses postId in the path
    return this.request('DELETE', `/api/post/like/${request.postId}`, request);
  }

  /**
   * Deletes one or more posts.
   * @param request The delete request details.
   * @returns A promise resolving with the delete response.
   */
  async deletePost(request: DeletePostRequest): Promise<DeletePostResponse> {
    // API endpoint uses postId in the path, assuming the first post ID for the URL
    const postId = request.posts[0]?.postId || '';
    if (!postId) {
      throw new ApiError(
        'Post ID is required for deletion path',
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }
    return this.request('DELETE', `/api/post/${postId}`, request);
  }

  // --- Internal Request Method ---
  private async _getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    // TODO: Confirm the exact Authorization header format expected by the API.
    // This is a placeholder assuming base64 encoded JSON of NearAuthData.
    if (this.nearAuthData && this.nearAuthData.signature) {
      try {
        // Example: Base64 encode the JSON stringified NearAuthData
        const encodedAuthData = btoa(JSON.stringify(this.nearAuthData));
        headers['Authorization'] = `NEAR ${encodedAuthData}`;
      } catch (e) {
        console.error('Failed to encode NearAuthData for Authorization header:', e);
        // Handle encoding error if necessary, maybe throw or log
      }
    }
    return headers;
  }

  private async request<T>(method: string, path: string, data?: any): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const authHeaders = await this._getAuthHeaders();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders,
        };

        const options: RequestInit = {
          method,
          headers,
          body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        };

        const response = await fetch(url, options);
        clearTimeout(timeoutId); // Clear timeout if fetch completes

        // Try parsing JSON regardless of status code, as errors might be in JSON body
        let responseData: any;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, throw a specific error or handle based on status
          if (!response.ok) {
            throw new ApiError(
              `API request failed with status ${response.status} and non-JSON response`,
              ApiErrorCode.NETWORK_ERROR, // Or a more specific code
              response.status as any,
              { originalStatusText: response.statusText },
            );
          }
          // If response was ok but JSON failed, maybe it was an empty 204 response?
          if (response.status === 204) return {} as T; // Handle No Content
          // Otherwise, rethrow JSON parse error or a custom error
          throw new ApiError(
            `Failed to parse JSON response: ${
              jsonError instanceof Error ? jsonError.message : String(jsonError)
            }`,
            ApiErrorCode.INTERNAL_ERROR, // Or NETWORK_ERROR?
            response.status as any,
          );
        }

        if (!response.ok) {
          lastError = this.handleErrorResponse(responseData, response.status);
          // Retry only on 5xx errors or potentially recoverable errors if defined
          const shouldRetry = response.status >= 500 ||
            (lastError instanceof ApiError && lastError.recoverable);
          if (shouldRetry && attempt < this.retries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
            continue; // Retry
          }
          throw lastError; // Throw error if not retrying or retries exhausted
        }

        // Handle cases where API indicates failure within a 2xx response
        if (
          responseData && typeof responseData === 'object' && 'success' in responseData &&
          !responseData.success && responseData.error
        ) {
          lastError = this.handleErrorResponse(responseData, response.status);
          // Decide if this specific type of "successful" response with an error payload should be retried
          const shouldRetry = lastError instanceof ApiError && lastError.recoverable;
          if (shouldRetry && attempt < this.retries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
            continue; // Retry
          }
          throw lastError;
        }

        return responseData as T; // Success
      } catch (error) {
        clearTimeout(timeoutId); // Clear timeout on error
        lastError = error as Error; // Store the error

        // Handle fetch/network errors specifically for retries
        const isNetworkError = error instanceof TypeError ||
          (error instanceof DOMException && error.name === 'AbortError');
        if (isNetworkError && attempt < this.retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
          continue; // Retry network error
        }

        // If it's not a known ApiError/PlatformError or a retryable network error, wrap it
        if (!(error instanceof ApiError || error instanceof PlatformError)) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            throw new ApiError(
              `Request timed out after ${this.timeout}ms`,
              ApiErrorCode.NETWORK_ERROR,
              408,
              { url },
            );
          }
          throw new ApiError(
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred during the request',
            ApiErrorCode.INTERNAL_ERROR,
            500,
            { originalError: String(error) },
          );
        }

        throw error; // Re-throw known ApiError/PlatformError or final network error
      }
    }

    // Should not be reachable if retries >= 0, but needed for type safety
    throw lastError ||
      new ApiError('Request failed after multiple retries', ApiErrorCode.INTERNAL_ERROR, 500);
  }

  // --- Error Handling using @crosspost/types ---
  private handleErrorResponse(data: any, status: number): ApiError | PlatformError {
    // Safely access nested error properties
    const errorData = data?.error || {};
    const message = errorData?.message || data?.message || 'An API error occurred';
    // Ensure code is a valid ApiErrorCode or default
    const codeString = errorData?.code || data?.code || ApiErrorCode.UNKNOWN_ERROR;
    const code = Object.values(ApiErrorCode).includes(codeString as ApiErrorCode)
      ? codeString as ApiErrorCode
      : ApiErrorCode.UNKNOWN_ERROR;

    const details = errorData?.details || data?.details || {};
    const recoverable = errorData?.recoverable ?? data?.recoverable ?? false;
    const platform = errorData?.platform || data?.platform;

    // Add original response data to details if not already present
    if (typeof details === 'object' && !details.originalResponse) {
      details.originalResponse = data; // Include the raw error payload for debugging
    }

    if (platform && Object.values(Platform).includes(platform as Platform)) {
      // If platform is specified and valid, it's a PlatformError
      return new PlatformError(
        message,
        platform as Platform,
        code, // Use the parsed code
        status as any, // Cast status
        details,
        recoverable,
      );
    } else {
      // Otherwise, it's a general ApiError
      return new ApiError(
        message,
        code, // Use the parsed code
        status as any, // Cast status
        details,
        recoverable,
      );
    }
  }
}
