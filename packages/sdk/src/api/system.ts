import type { EndpointRateLimitResponse, RateLimitResponse } from '@crosspost/types';
import { makeRequest, type RequestOptions } from '../core/request.ts';

/**
 * System-related API operations
 * Includes rate limits, health checks, and other system-related functionality
 */
export class SystemApi {
  private options: RequestOptions;

  /**
   * Creates an instance of SystemApi
   * @param options Request options
   */
  constructor(options: RequestOptions) {
    this.options = options;
  }

  /**
   * Gets the current rate limit status
   * @returns A promise resolving with the rate limit response
   */
  async getRateLimits(): Promise<RateLimitResponse> {
    return makeRequest<RateLimitResponse>(
      'GET',
      '/api/rate-limit',
      this.options,
    );
  }

  /**
   * Gets the rate limit status for a specific endpoint
   * @param endpoint The endpoint to get rate limit for
   * @returns A promise resolving with the endpoint rate limit response
   */
  async getEndpointRateLimit(endpoint: string): Promise<EndpointRateLimitResponse> {
    return makeRequest<EndpointRateLimitResponse>(
      'GET',
      `/api/rate-limit/${endpoint}`,
      this.options,
    );
  }

  /**
   * Gets the health status of the API
   * @returns A promise resolving with the health status
   */
  async getHealthStatus(): Promise<{ status: string }> {
    return makeRequest<{ status: string }>(
      'GET',
      '/health',
      this.options,
    );
  }
}
