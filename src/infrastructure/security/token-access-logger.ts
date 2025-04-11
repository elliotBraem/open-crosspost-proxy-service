import { Env } from '../../config/env.ts';
import { PlatformName } from '@crosspost/types';
import { PrefixedKvStore } from '../../utils/kv-store.utils.ts';

export enum TokenOperation {
  GET = 'get',
  SAVE = 'save',
  DELETE = 'delete',
  CHECK = 'check',
}

export interface TokenAccessLog {
  timestamp: number;
  operation: TokenOperation;
  userId: string; // Redacted or hashed in logs
  success: boolean;
  error?: string;
  platform?: PlatformName;
}

export class TokenAccessLogger {
  constructor(
    private env: Env,
    private logStore: PrefixedKvStore,
  ) {}

  /**
   * Log a token access operation
   * @param operation The operation performed
   * @param userId The user ID (will be partially redacted in logs)
   * @param success Whether the operation was successful
   * @param error Optional error message
   * @param platform Optional platform identifier
   */
  async logAccess(
    operation: TokenOperation,
    userId: string,
    success: boolean,
    error?: string,
    platform?: PlatformName,
  ): Promise<void> {
    try {
      // Create a redacted user ID for logging
      // Only keep first 4 and last 4 characters, replace middle with ***
      const redactedUserId = this.redactUserId(userId);

      const logEntry: TokenAccessLog = {
        timestamp: Date.now(),
        operation,
        userId: redactedUserId,
        success,
        error,
        platform,
      };

      // Use timestamp as part of the key for chronological ordering
      await this.logStore.set([logEntry.timestamp.toString()], logEntry);

      // Also log to console in development
      if (this.env.ENVIRONMENT !== 'production') {
        console.log(
          `Token ${operation} for user ${redactedUserId}: ${success ? 'Success' : 'Failed'}`,
        );
        if (error) {
          console.error(`Error: ${error}`);
        }
      }
    } catch (logError) {
      // Don't throw errors from logging - just log to console
      console.error('Error logging token access:', logError);
    }
  }

  /**
   * Redact a user ID for privacy in logs
   * @param userId The full user ID
   * @returns Redacted user ID
   */
  private redactUserId(userId: string): string {
    if (userId.length <= 8) {
      return userId; // Too short to redact meaningfully
    }

    const prefix = userId.substring(0, 4);
    const suffix = userId.substring(userId.length - 4);
    return `${prefix}***${suffix}`;
  }

  /**
   * Get recent access logs
   * @param limit Maximum number of logs to retrieve
   * @returns Array of token access logs
   */
  async getRecentLogs(limit = 100): Promise<TokenAccessLog[]> {
    try {
      // Use list method from PrefixedKvStore to get logs in reverse chronological order
      const entries = await this.logStore.list<TokenAccessLog>([], {
        reverse: true,
        limit,
      });

      return entries.map((entry) => entry.value);
    } catch (error) {
      console.error('Error retrieving token access logs:', error);
      return [];
    }
  }
}
