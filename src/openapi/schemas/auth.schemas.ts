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

  UserProfile: {
    type: 'object',
    required: ['userId', 'username', 'platform', 'lastUpdated'],
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID on the platform',
      },
      username: {
        type: 'string',
        description: 'The username on the platform',
      },
      url: {
        type: 'string',
        description: 'The profile url on the platform',
      },
      profileImageUrl: {
        type: 'string',
        description: "URL to the user's profile image",
      },
      isPremium: {
        type: 'boolean',
        description: 'Whether the user has a premium account',
      },
      platform: {
        type: 'string',
        description: 'The social media platform',
      },
      lastUpdated: {
        type: 'number',
        description: 'Timestamp when the profile was last updated',
      },
    },
  },

  RefreshProfileResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['profile'],
        properties: {
          profile: {
            $ref: '#/components/schemas/UserProfile',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },
};
