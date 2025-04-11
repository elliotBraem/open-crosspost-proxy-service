/**
 * Auth Schemas and Types
 * Defines Zod schemas for authentication-related requests and responses
 * TypeScript types are derived from Zod schemas for type safety
 */

import { z } from 'zod';
import { EnhancedResponseSchema } from './response.ts';
import { PlatformSchema } from './common.ts';

// Platform parameter schema
export const PlatformParamSchema = z.object({
  platform: z.string().describe('Social media platform'),
}).describe('Platform parameter');

// Auth initialization request schema
export const AuthInitRequestSchema = z.object({
  successUrl: z.string().url().optional().describe(
    'URL to redirect to on successful authentication',
  ),
  errorUrl: z.string().url().optional().describe('URL to redirect to on authentication error'),
}).describe('Auth initialization request');

// Auth URL response schema
export const AuthUrlResponseSchema = EnhancedResponseSchema(
  z.object({
    url: z.string().describe('Authentication URL to redirect the user to'),
    state: z.string().describe('State parameter for CSRF protection'),
    platform: PlatformSchema,
  }),
).describe('Auth URL response');

// Auth callback query schema
export const AuthCallbackQuerySchema = z.object({
  code: z.string().describe('Authorization code from OAuth provider'),
  state: z.string().describe('State parameter for CSRF protection'),
}).describe('Auth callback query');

// Auth callback response schema
export const AuthCallbackResponseSchema = EnhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the authentication was successful'),
    platform: PlatformSchema,
    userId: z.string().describe('User ID'),
    redirectUrl: z.string().optional().describe('URL to redirect the user to after authentication'),
  }),
).describe('Auth callback response');

// Auth status response schema
export const AuthStatusResponseSchema = EnhancedResponseSchema(
  z.object({
    platform: PlatformSchema,
    userId: z.string().describe('User ID'),
    authenticated: z.boolean().describe('Whether the user is authenticated'),
    tokenStatus: z.object({
      valid: z.boolean().describe('Whether the token is valid'),
      expired: z.boolean().describe('Whether the token is expired'),
      expiresAt: z.string().optional().describe('When the token expires'),
    }),
  }),
).describe('Auth status response');

// Auth revoke response schema
export const AuthRevokeResponseSchema = EnhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the revocation was successful'),
    platform: PlatformSchema,
    userId: z.string().describe('User ID'),
  }),
).describe('Auth revoke response');

// Connected account schema
export const ConnectedAccountSchema = z.object({
  platform: PlatformSchema,
  userId: z.string().describe('User ID on the platform'),
  username: z.string().optional().describe('Username on the platform (if available)'),
  profileUrl: z.string().optional().describe('URL to the user profile'),
  connectedAt: z.string().optional().describe('When the account was connected'),
}).describe('Connected account');

// Connected accounts response schema
export const ConnectedAccountsResponseSchema = EnhancedResponseSchema(
  z.array(ConnectedAccountSchema),
).describe('Connected accounts response');

// NEAR authorization request schema
export const NearAuthorizationRequestSchema = z.object({
  // No additional parameters needed, as the NEAR account ID is extracted from the signature
}).describe('NEAR authorization request');

// NEAR authorization response schema
export const NearAuthorizationResponseSchema = EnhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the authorization was successful'),
    nearAccount: z.string().describe('NEAR account ID'),
    authorized: z.boolean().describe('Whether the account is authorized'),
  }),
).describe('NEAR authorization response');

// NEAR authorization status response schema
export const NearAuthorizationStatusResponseSchema = EnhancedResponseSchema(
  z.object({
    nearAccount: z.string().describe('NEAR account ID'),
    authorized: z.boolean().describe('Whether the account is authorized'),
    authorizedAt: z.string().optional().describe('When the account was authorized'),
  }),
).describe('NEAR authorization status response');

// Derive TypeScript types from Zod schemas
export type PlatformParam = z.infer<typeof PlatformParamSchema>;
export type AuthInitRequest = z.infer<typeof AuthInitRequestSchema>;
export type AuthUrlResponse = z.infer<typeof AuthUrlResponseSchema>;
export type AuthCallbackQuery = z.infer<typeof AuthCallbackQuerySchema>;
export type AuthCallbackResponse = z.infer<typeof AuthCallbackResponseSchema>;
export type AuthStatusResponse = z.infer<typeof AuthStatusResponseSchema>;
export type AuthRevokeResponse = z.infer<typeof AuthRevokeResponseSchema>;
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;
export type ConnectedAccountsResponse = z.infer<typeof ConnectedAccountsResponseSchema>;
export type NearAuthorizationRequest = z.infer<typeof NearAuthorizationRequestSchema>;
export type NearAuthorizationResponse = z.infer<typeof NearAuthorizationResponseSchema>;
export type NearAuthorizationStatusResponse = z.infer<typeof NearAuthorizationStatusResponseSchema>;
