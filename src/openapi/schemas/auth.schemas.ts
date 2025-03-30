/**
 * Auth Schemas
 * Defines OpenAPI schemas for authentication-related requests and responses
 */
export const authSchemas = {
  // Request Schemas
  InitializeAuthRequest: {
    type: 'object',
    required: ['redirectUri'],
    properties: {
      redirectUri: {
        type: 'string',
        format: 'uri',
        description: 'The URI to redirect to after authentication',
      },
      scopes: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'The OAuth scopes to request',
      },
      state: {
        type: 'string',
        description: 'Optional state parameter for CSRF protection',
      },
    },
  },

  AuthCallbackRequest: {
    type: 'object',
    required: ['code', 'state', 'savedState', 'redirectUri'],
    properties: {
      code: {
        type: 'string',
        description: 'The authorization code from the OAuth callback',
      },
      state: {
        type: 'string',
        description: 'The state parameter from the callback',
      },
      savedState: {
        type: 'string',
        description: 'The state parameter saved during initialization',
      },
      redirectUri: {
        type: 'string',
        format: 'uri',
        description: 'The redirect URI used in the initial request',
      },
      codeVerifier: {
        type: 'string',
        description: 'The PKCE code verifier (if PKCE was used)',
      },
    },
  },

  AuthorizeNearRequest: {
    type: 'object',
    required: ['account_id', 'public_key', 'signature', 'message', 'nonce'],
    properties: {
      account_id: {
        type: 'string',
        description: 'The NEAR account ID being authorized.',
        example: 'user.near',
      },
      public_key: {
        type: 'string',
        description: "The user's public key (e.g., 'ed25519:...')",
        example: 'ed25519:...',
      },
      signature: {
        type: 'string',
        description: 'The base64-encoded signature of the payload.',
        example: '...',
      },
      message: {
        type: 'string',
        description: 'The message that was signed.',
        example: 'Authorize NEAR Account',
      },
      nonce: {
        type: 'string',
        description: 'A unique nonce (timestamp as string) to prevent replay attacks.',
        example: '1678886400000',
      },
      recipient: {
        type: 'string',
        description: 'The intended recipient of the message (optional, defaults to service ID).',
        example: 'crosspost.near',
      },
    },
  },

  // Response Schemas
  InitializeAuthResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['authUrl', 'state'],
        properties: {
          authUrl: {
            type: 'string',
            format: 'uri',
            description: 'The authentication URL to redirect the user to',
          },
          state: {
            type: 'string',
            description: 'The state parameter for CSRF protection',
          },
          codeVerifier: {
            type: 'string',
            description: 'The PKCE code verifier (if PKCE is used)',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  AuthCallbackResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['userId', 'tokens'],
        properties: {
          userId: {
            type: 'string',
            description: 'The user ID to use for subsequent requests',
          },
          tokens: {
            type: 'object',
            required: ['accessToken', 'refreshToken'],
            properties: {
              accessToken: {
                type: 'string',
                description: 'The access token',
              },
              refreshToken: {
                type: 'string',
                description: 'The refresh token',
              },
              expiresAt: {
                type: 'number',
                description: 'The timestamp when the access token expires',
              },
            },
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  RefreshTokenResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['accessToken', 'refreshToken'],
        properties: {
          accessToken: {
            type: 'string',
            description: 'The new access token',
          },
          refreshToken: {
            type: 'string',
            description: 'The new refresh token',
          },
          expiresAt: {
            type: 'number',
            description: 'The timestamp when the access token expires',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  RevokeTokenResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['success'],
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the token was successfully revoked',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  ValidateTokensResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['hasTokens'],
        properties: {
          hasTokens: {
            type: 'boolean',
            description: 'Whether the user has valid tokens',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  AuthorizeNearResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['success', 'signerId'],
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the NEAR account was successfully authorized.',
          },
          signerId: {
            type: 'string',
            description: 'The NEAR account ID that was authorized.',
            example: 'user.near',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  UnauthorizeNearResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['success', 'signerId'],
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the NEAR account was successfully unauthorized.',
          },
          signerId: {
            type: 'string',
            description: 'The NEAR account ID that was unauthorized.',
            example: 'user.near',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },
};
