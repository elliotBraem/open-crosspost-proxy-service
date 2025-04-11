# @crosspost/sdk

SDK for interacting with the Crosspost API.

## Overview

This package provides a client for interacting with the Crosspost API, allowing you to easily
integrate social media posting capabilities into your applications. The SDK is designed to be
flexible and easy to use, with support for multiple authentication methods and platforms.

## Features

- Unified client for all supported platforms
- Authentication with NEAR wallet signatures or API keys
- Platform-specific clients (Twitter, with more to come)
- Type-safe request/response handling
- Comprehensive error handling

## Installation

```bash
# Using npm
npm install @crosspost/sdk

# Using yarn
yarn add @crosspost/sdk

# Using pnpm
pnpm add @crosspost/sdk

# Using bun
bun add @crosspost/sdk
```

## Usage

### Initializing the SDK

```typescript
import { CrosspostClient } from '@crosspost/sdk';
import { NearSigner } from '@crosspost/near-simple-signing';

// Initialize with NEAR wallet signature authentication
const signer = new NearSigner({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
});

// Connect to NEAR wallet (browser environment)
await signer.connect();

// Initialize the SDK with the NEAR signer
const client = new CrosspostClient({
  baseUrl: 'https://api.crosspost.example',
  auth: {
    type: 'near',
    signer: signer,
  },
});

// Or initialize with API key authentication
const apiKeyClient = new CrosspostClient({
  baseUrl: 'https://api.crosspost.example',
  auth: {
    type: 'apiKey',
    apiKey: 'your-api-key',
  },
});
```

### Using the Twitter Client

```typescript
// Create a post
const createPostResponse = await client.twitter.createPost({
  content: {
    text: 'Hello from Crosspost SDK!',
  },
});

console.log(`Post created with ID: ${createPostResponse.id}`);

// Create a post with media
const createPostWithMediaResponse = await client.twitter.createPost({
  content: {
    text: 'Check out this image!',
    media: [
      {
        type: 'image',
        url: 'https://example.com/image.jpg',
      },
    ],
  },
});

// Like a post
await client.twitter.likePost({
  postId: '1234567890',
});

// Repost a post
await client.twitter.repost({
  postId: '1234567890',
});

// Reply to a post
await client.twitter.reply({
  postId: '1234567890',
  content: {
    text: 'This is a reply!',
  },
});

// Delete a post
await client.twitter.deletePost({
  postId: '1234567890',
});
```

### Error Handling

```typescript
import { ApiError, CrosspostClient } from '@crosspost/sdk';

try {
  const response = await client.twitter.createPost({
    content: {
      text: 'Hello from Crosspost SDK!',
    },
  });

  console.log(`Post created with ID: ${response.id}`);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Error Code: ${error.code}`);
    console.error(`Status: ${error.status}`);
  } else {
    console.error(`Unexpected error: ${error.message}`);
  }
}
```

### Using with NEAR Authentication Data Directly

If you already have NEAR authentication data (e.g., from a previous signature), you can use it
directly:

```typescript
import { CrosspostClient } from '@crosspost/sdk';

const client = new CrosspostClient({
  baseUrl: 'https://api.crosspost.example',
  auth: {
    type: 'near',
    authData: {
      account_id: 'example.testnet',
      public_key: 'ed25519:8hSHprDq2StXwMtNd43wDTXQYsjXcD4MJxUTvwtnmM4T',
      signature: 'base64-encoded-signature',
      message: 'message-that-was-signed',
      nonce: 'nonce-used-for-signing',
      recipient: 'crosspost.near',
    },
  },
});
```

## API Reference

### `CrosspostClient`

The main client for interacting with the Crosspost API.

#### Constructor

```typescript
constructor(options: CrosspostClientOptions)
```

Options:

- `baseUrl`: Base URL of the Crosspost API
- `auth`: Authentication configuration (NEAR or API key)
- `fetch`: Custom fetch implementation (optional)

#### Properties

- `twitter`: Twitter client for interacting with Twitter API

### Platform Clients

#### Twitter Client

- `createPost(params)`: Create a new post
- `repost(params)`: Repost an existing post
- `quotePost(params)`: Quote an existing post
- `reply(params)`: Reply to an existing post
- `likePost(params)`: Like a post
- `unlikePost(params)`: Unlike a post
- `deletePost(params)`: Delete a post

## License

MIT
