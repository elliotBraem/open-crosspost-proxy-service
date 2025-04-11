/**
 * @crosspost/sdk
 * SDK for interacting with the Crosspost API
 */
export { CrosspostClient } from './core/client.js';
export type { CrosspostClientConfig } from './core/client.js'; // Export config type

// Re-export types from @crosspost/types for convenience
export * from '@crosspost/types';

// Re-export NearAuthData from the signing package
export type { NearAuthData } from './core/client.js';
// export type { NearAuthData } from '@crosspost/near-simple-signing';
