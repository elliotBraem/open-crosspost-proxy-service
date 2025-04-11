/**
 * Spam Detection Utilities
 * Provides utilities for avoiding spam detection when posting to social media platforms
 */

import { PostContent } from '@crosspost/types';

/**
 * Add a slight variation to content to avoid duplicate content detection
 * @param content The original content
 * @param index The index of the target (0 for first, higher for subsequent)
 * @returns Modified content with variation
 */
export function addContentVariation(content: PostContent[], index: number): PostContent[] {
  // Only add variation for targets after the first one
  if (index === 0) return content;

  // Create a deep copy of the content array
  const modifiedContent = JSON.parse(JSON.stringify(content)) as PostContent[];

  // Add a zero-width space or other invisible character to each text element
  for (const post of modifiedContent) {
    if (post.text) {
      // Add zero-width space at a random position
      const position = Math.floor(Math.random() * post.text.length);
      post.text = post.text.slice(0, position) + '\u200B' + post.text.slice(position);
    }
  }

  return modifiedContent;
}

/**
 * Calculate delay between posts to avoid spam detection
 * @param platformName The platform name
 * @returns Delay in milliseconds
 */
export function getPostDelay(platformName: string): number {
  // Different platforms may need different delays
  const delays: Record<string, number> = {
    twitter: 1500, // 1.5 seconds for Twitter
    default: 1000, // 1 second default
  };

  return delays[platformName] || delays.default;
}
