import { NearAuthService } from './src/infrastructure/security/near-auth-service.ts';
import { Platform, PlatformName } from '@crosspost/types';
import { getSecureEnv, isProduction } from './src/config/env.ts';
import { AuthController } from './src/controllers/auth.controller.ts';
import { LeaderboardController } from './src/controllers/leaderboard.controller.ts';
import {
  CreateController,
  DeleteController,
  LikeController,
  QuoteController,
  ReplyController,
  RepostController,
  UnlikeController,
} from './src/controllers/post/index.ts';
import { RateLimitController } from './src/controllers/rate-limit.controller.ts';
import { ActivityTrackingService } from './src/domain/services/activity-tracking.service.ts';
import { AuthService } from './src/domain/services/auth.service.ts';
import { PostService } from './src/domain/services/post.service.ts';
import { RateLimitService } from './src/domain/services/rate-limit.service.ts';
import { PlatformAuth } from './src/infrastructure/platform/abstract/platform-auth.interface.ts';
import { PlatformPost } from './src/infrastructure/platform/abstract/platform-post.interface.ts';
import { PlatformProfile } from './src/infrastructure/platform/abstract/platform-profile.interface.ts';
import { PlatformRateLimit } from './src/infrastructure/platform/abstract/platform-rate-limit.interface.ts';
import { TwitterAuth } from './src/infrastructure/platform/twitter/twitter-auth.ts';
import { TwitterClient } from './src/infrastructure/platform/twitter/twitter-client.ts';
import { TwitterMedia } from './src/infrastructure/platform/twitter/twitter-media.ts';
import { TwitterPost } from './src/infrastructure/platform/twitter/twitter-post.ts';
import { TwitterProfile } from './src/infrastructure/platform/twitter/twitter-profile.ts';
import { TwitterRateLimit } from './src/infrastructure/platform/twitter/twitter-rate-limit.ts';
import { TokenAccessLogger } from './src/infrastructure/security/token-access-logger.ts';
import { TokenStorage } from './src/infrastructure/storage/auth-token-storage.ts';
import { UserProfileStorage } from './src/infrastructure/storage/user-profile-storage.ts';
import { PrefixedKvStore } from './src/utils/kv-store.utils.ts';

/**
 * Initialize all dependencies and controllers
 * @returns Initialized controllers
 */
export function initializeApp() {
  // Get environment configuration
  const env = getSecureEnv(isProduction());

  // Initialize KV stores
  const tokenKvStore = new PrefixedKvStore(['tokens']);
  const authStateKvStore = new PrefixedKvStore(['auth']);
  const nearAuthKvStore = new PrefixedKvStore(['near_auth']);
  const profileKvStore = new PrefixedKvStore(['profile']);
  const tokenAccessLogKvStore = new PrefixedKvStore(['token_access_logs']);

  // Initialize infrastructure services
  const tokenAccessLogger = new TokenAccessLogger(env, tokenAccessLogKvStore);
  const tokenStorage = new TokenStorage(env.ENCRYPTION_KEY, tokenKvStore, tokenAccessLogger);

  const nearAuthService = new NearAuthService(
    env,
    tokenStorage,
    nearAuthKvStore,
    tokenAccessLogger,
  );

  const userProfileStorage = new UserProfileStorage(env, profileKvStore);

  // Initialize platform-specific implementations
  const twitterClient = new TwitterClient(env, nearAuthService);
  const twitterMedia = new TwitterMedia(env, twitterClient);
  const twitterRateLimit = new TwitterRateLimit(env, twitterClient);
  const twitterPost = new TwitterPost(env, twitterClient, twitterMedia);
  const twitterProfile = new TwitterProfile(env, twitterClient, userProfileStorage);

  // Create platform auth map with Twitter auth
  const twitterAuthKvStore = new PrefixedKvStore(['auth', Platform.TWITTER]);
  const twitterAuth = new TwitterAuth(
    env,
    nearAuthService,
    twitterAuthKvStore,
    twitterClient,
    twitterProfile,
  );

  const platformAuthMap = new Map<PlatformName, PlatformAuth>();
  platformAuthMap.set(Platform.TWITTER, twitterAuth);

  // Create platform profile map with Twitter profile
  const platformProfileMap = new Map<PlatformName, PlatformProfile>();
  platformProfileMap.set(Platform.TWITTER, twitterProfile);

  // Create platform post map
  const platformPostMap = new Map<PlatformName, PlatformPost>();
  platformPostMap.set(Platform.TWITTER, twitterPost);

  // Create platform rate limit map
  const platformRateLimitMap = new Map<PlatformName, PlatformRateLimit>();
  platformRateLimitMap.set(Platform.TWITTER, twitterRateLimit);

  // Initialize domain services
  const authService = new AuthService(
    env,
    nearAuthService,
    authStateKvStore,
    platformAuthMap,
    platformProfileMap,
  );

  // Pass the platform maps to the services
  const postService = new PostService(env, platformPostMap);
  const rateLimitService = new RateLimitService(env, platformRateLimitMap);
  const activityTrackingService = new ActivityTrackingService(env); // Needs DI update later

  // Initialize controllers
  const authController = new AuthController(authService, nearAuthService, env);
  const leaderboardController = new LeaderboardController();
  const rateLimitController = new RateLimitController(rateLimitService); // Pass dependency

  // Initialize post controllers with dependencies
  const postControllers = {
    create: new CreateController(
      postService,
      rateLimitService,
      activityTrackingService,
      authService,
    ),
    repost: new RepostController(
      postService,
      rateLimitService,
      activityTrackingService,
      authService,
    ),
    quote: new QuoteController(postService, rateLimitService, activityTrackingService, authService),
    delete: new DeleteController(
      postService,
      rateLimitService,
      activityTrackingService,
      authService,
    ),
    reply: new ReplyController(postService, rateLimitService, activityTrackingService, authService),
    like: new LikeController(postService, rateLimitService, activityTrackingService, authService),
    unlike: new UnlikeController(
      postService,
      rateLimitService,
      activityTrackingService,
      authService,
    ),
  };

  return {
    authController,
    leaderboardController,
    rateLimitController,
    postControllers,
    nearAuthService,
  };
}
