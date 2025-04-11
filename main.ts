import {
  AccountActivityParamsSchema,
  AccountActivityQuerySchema,
  AccountPostsParamsSchema,
  AccountPostsQuerySchema,
  AuthCallbackQuerySchema,
  AuthInitRequestSchema,
  CreatePostRequestSchema,
  DeletePostRequestSchema,
  LeaderboardQuerySchema,
  LikePostRequestSchema,
  NearAuthorizationRequestSchema,
  PlatformParamSchema,
  QuotePostRequestSchema,
  RateLimitEndpointParamSchema,
  ReplyToPostRequestSchema,
  RepostRequestSchema,
  UnlikePostRequestSchema,
} from '@crosspost/types';
import { Hono } from './deps.ts';
import { getSecureEnv, isProduction } from './src/config/env.ts';
import { AuthMiddleware } from './src/middleware/auth.middleware.ts';
import { corsMiddleware } from './src/middleware/cors.middleware.ts';
import { errorMiddleware } from './src/middleware/error.middleware.ts';
import { PlatformMiddleware } from './src/middleware/supported-platforms.middleware.ts';
import { UsageRateLimitMiddleware } from './src/middleware/usage-rate-limit.middleware.ts';
import { ValidationMiddleware } from './src/middleware/validation.middleware.ts';
import { initializeApp } from './init.ts';

// Create a new Hono app
const app = new Hono();

// Apply global middleware
app.use('*', errorMiddleware());
app.use('*', corsMiddleware());

// Initialize app and get dependencies
const {
  authController,
  leaderboardController,
  rateLimitController,
  postControllers,
  nearAuthService,
} = initializeApp();

// Initialize middleware with dependencies
AuthMiddleware.initialize(nearAuthService);

// Health check route
app.get('/health', (c) => c.json({ status: 'ok' }));

// API routes
const api = new Hono();

// Main auth router
const auth = new Hono();

// Generic platform routes
auth.post(
  '/:platform/login',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  ValidationMiddleware.validateBody(AuthInitRequestSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.initializeAuth(c, platform);
  },
);

auth.get(
  '/:platform/callback',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  ValidationMiddleware.validateQuery(AuthCallbackQuerySchema),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.handleCallback(c, platform);
  },
);

auth.post(
  '/:platform/refresh',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.refreshToken(c, platform);
  },
);

auth.delete(
  '/:platform/revoke',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.revokeToken(c, platform);
  },
);

auth.get(
  '/:platform/status',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.hasValidTokens(c, platform);
  },
);

auth.post(
  '/:platform/refresh-profile',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.refreshUserProfile(c, platform);
  },
);

// Common auth routes that aren't platform-specific
auth.get(
  '/accounts',
  AuthMiddleware.validateNearSignature(),
  (c) => authController.listConnectedAccounts(c),
);
// Authorize a NEAR account
auth.post(
  '/authorize/near',
  ValidationMiddleware.validateBody(NearAuthorizationRequestSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => authController.authorizeNear(c),
);
// Unauthorize a NEAR account
auth.delete(
  '/unauthorize/near',
  ValidationMiddleware.validateBody(NearAuthorizationRequestSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => authController.unauthorizeNear(c),
);
// Check NEAR account authorization status
auth.get(
  '/authorize/near/status',
  AuthMiddleware.validateNearSignature(),
  (c) => authController.checkNearAuthorizationStatus(c),
);

// Post routes
const post = new Hono();
post.post(
  '/',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(CreatePostRequestSchema),
  UsageRateLimitMiddleware.limitByNearAccount('post'),
  (c) => postControllers.create.handle(c),
);
post.post(
  '/repost',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(RepostRequestSchema),
  (c) => postControllers.repost.handle(c),
);
post.post(
  '/quote',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(QuotePostRequestSchema),
  (c) => postControllers.quote.handle(c),
);
post.delete(
  '/:id',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(DeletePostRequestSchema),
  (c) => postControllers.delete.handle(c),
);
post.post(
  '/reply',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(ReplyToPostRequestSchema),
  (c) => postControllers.reply.handle(c),
);
post.post(
  '/like/:id',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(LikePostRequestSchema),
  (c) => postControllers.like.handle(c),
);
post.delete(
  '/like/:id',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(UnlikePostRequestSchema),
  (c) => postControllers.unlike.handle(c),
);

// Leaderboard routes
const leaderboard = new Hono();
leaderboard.get(
  '/',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateQuery(LeaderboardQuerySchema),
  (c) => leaderboardController.getLeaderboard(c),
);
leaderboard.get(
  '/:signerId',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateParams(AccountActivityParamsSchema),
  ValidationMiddleware.validateQuery(AccountActivityQuerySchema),
  (c) => leaderboardController.getAccountActivity(c),
);
leaderboard.get(
  '/:signerId/posts',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateParams(AccountPostsParamsSchema),
  ValidationMiddleware.validateQuery(AccountPostsQuerySchema),
  (c) => leaderboardController.getAccountPosts(c),
);

// Mount routes
api.route('/post', post);
api.route('/leaderboard', leaderboard);
api.route('/activity', leaderboard);
app.route('/auth', auth);

// Usage rate limits (associated with near account)
const usageRateLimit = new Hono();
usageRateLimit.get(
  '/:endpoint?',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateParams(RateLimitEndpointParamSchema),
  (c) => rateLimitController.getUsageRateLimit(c),
);
api.route('/rate-limit', usageRateLimit);

app.route('/api', api);

const env = getSecureEnv(isProduction());
const port = parseInt(Deno.env.get('PORT') || '8000');

// Initialize usage rate limit middleware with configuration
UsageRateLimitMiddleware.initialize({
  maxPostsPerDay: 10, // Configurable limit for posts per day per NEAR account
});

console.log(`Starting server on port ${port}...`);
console.log(`Environment: ${env.ENVIRONMENT}`);

Deno.serve({ port }, app.fetch);
