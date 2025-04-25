import { z } from 'zod';
import { PlatformSchema } from './common.ts';

export const RateLimitPlatformEndpointParamsSchema = z.object({
  platform: z.string().describe('Platform to get rate limits for'),
  endpoint: z.string().describe('Endpoint to get rate limits for'),
}).describe('Rate limit platform endpoint parameters');

export const RateLimitPlatformParamsSchema = z.object({
  platform: z.string().describe('Platform to get rate limits for'),
}).describe('Rate limit platform parameters');

export const RateLimitEndpointParamSchema = z.object({
  endpoint: z.string().optional().describe(
    'Specific endpoint to get rate limit information for (optional)',
  ),
}).describe('Rate limit endpoint parameter');

export const RateLimitEndpointSchema = z.object({
  endpoint: z.string().describe('API endpoint'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP method'),
  limit: z.number().describe('Rate limit'),
  remaining: z.number().describe('Remaining requests'),
  reset: z.number().describe('Reset timestamp (Unix timestamp in seconds)'),
  resetDate: z.string().describe('Reset date (ISO string)'),
}).describe('Rate limit endpoint');

export const RateLimitStatusSchema = z.object({
  endpoint: z.string().describe('API endpoint or action'),
  limit: z.number().describe('Maximum number of requests allowed in the time window'),
  remaining: z.number().describe('Number of requests remaining in the current time window'),
  reset: z.string().datetime().describe('Timestamp when the rate limit will reset'),
  resetSeconds: z.number().describe('Seconds until the rate limit will reset'),
}).describe('Rate limit status');

export const PlatformRateLimitSchema = z.object({
  platform: PlatformSchema,
  endpoints: z.record(z.string(), RateLimitStatusSchema).describe(
    'Rate limit status for each endpoint',
  ),
}).describe('Platform-specific rate limit');

export const UsageRateLimitSchema = z.object({
  endpoint: z.string().describe('API endpoint or action'),
  limit: z.number().describe('Maximum number of requests allowed in the time window'),
  remaining: z.number().describe('Number of requests remaining in the current time window'),
  reset: z.string().datetime().describe('Timestamp when the rate limit will reset'),
  resetSeconds: z.number().describe('Seconds until the rate limit will reset'),
  timeWindow: z.string().describe('Time window for the rate limit'),
}).describe('Usage rate limit');

export const RateLimitStatusResponseSchema = z.object({
  platform: PlatformSchema,
  userId: z.string().optional().describe('User ID'),
  endpoints: z.array(RateLimitEndpointSchema).describe('Rate limits for specific endpoints'),
  app: z.object({
    limit: z.number().describe('App-wide rate limit'),
    remaining: z.number().describe('Remaining requests'),
    reset: z.number().describe('Reset timestamp (Unix timestamp in seconds)'),
    resetDate: z.string().describe('Reset date (ISO string)'),
  }).optional().describe('App-wide rate limits'),
}).describe('Rate limit status response');

export const AllRateLimitsResponseSchema = z.object({
  platforms: z.record(
    PlatformSchema,
    z.object({
      users: z.record(
        z.string(),
        z.object({
          endpoints: z.array(RateLimitEndpointSchema).describe(
            'Rate limits for specific endpoints',
          ),
          lastUpdated: z.string().describe('Last updated date (ISO string)'),
        }),
      ).describe('User-specific rate limits'),
      app: z.object({
        limit: z.number().describe('App-wide rate limit'),
        remaining: z.number().describe('Remaining requests'),
        reset: z.number().describe('Reset timestamp (Unix timestamp in seconds)'),
        resetDate: z.string().describe('Reset date (ISO string)'),
      }).optional().describe('App-wide rate limits'),
    }),
  ).describe('Rate limits by platform'),
}).describe('All rate limits response');

export const RateLimitResponseSchema = z.object({
  platformLimits: z.array(PlatformRateLimitSchema).describe('Platform-specific rate limits'),
  usageLimits: z.record(z.string(), UsageRateLimitSchema).describe(
    'Usage-based rate limits for the NEAR account',
  ),
  signerId: z.string().describe('NEAR account ID'),
}).describe('Rate limit response');

export const EndpointRateLimitResponseSchema = z.object({
  platformLimits: z.array(
    z.object({
      platform: PlatformSchema,
      status: RateLimitStatusSchema.describe('Rate limit status for the endpoint'),
    }),
  ).describe('Platform-specific rate limits for the endpoint'),
  usageLimit: UsageRateLimitSchema.describe('Usage-based rate limit for the NEAR account'),
  endpoint: z.string().describe('API endpoint or action'),
  signerId: z.string().describe('NEAR account ID'),
}).describe('Endpoint rate limit response');

export type RateLimitPlatformEndpointParams = z.infer<typeof RateLimitPlatformEndpointParamsSchema>;
export type RateLimitPlatformParams = z.infer<typeof RateLimitPlatformParamsSchema>;
export type RateLimitEndpointParam = z.infer<typeof RateLimitEndpointParamSchema>;
export type RateLimitEndpoint = z.infer<typeof RateLimitEndpointSchema>;
export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;
export type PlatformRateLimit = z.infer<typeof PlatformRateLimitSchema>;
export type UsageRateLimit = z.infer<typeof UsageRateLimitSchema>;
export type RateLimitStatusResponse = z.infer<typeof RateLimitStatusResponseSchema>;
export type AllRateLimitsResponse = z.infer<typeof AllRateLimitsResponseSchema>;
export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;
export type EndpointRateLimitResponse = z.infer<typeof EndpointRateLimitResponseSchema>;
