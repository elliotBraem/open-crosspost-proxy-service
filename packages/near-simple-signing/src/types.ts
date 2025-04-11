/**
 * Types for NEAR Simple Signing
 */

/**
 * Network ID
 */
export type NetworkId = 'mainnet' | 'testnet';

/**
 * NEAR Signer Options
 */
export interface NearSignerOptions {
  /**
   * Network ID ('mainnet' or 'testnet')
   */
  networkId: NetworkId;

  /**
   * RPC node URL
   */
  nodeUrl: string;

  /**
   * Wallet URL (for browser environment)
   */
  walletUrl?: string;

  /**
   * Account ID (for Node.js environment)
   */
  accountId?: string;

  /**
   * Key pair (for Node.js environment)
   */
  keyPair?: any; // KeyPair from near-api-js

  /**
   * Relayer URL (optional)
   */
  relayerUrl?: string;

  /**
   * Additional headers (optional)
   */
  headers?: Record<string, string>;

  /**
   * Default recipient for signatures (optional)
   * @default 'crosspost.near'
   */
  defaultRecipient?: string;
}

/**
 * NEAR Authentication Data
 */
export interface NearAuthData {
  /**
   * NEAR account ID
   */
  account_id: string;

  /**
   * Public key used for signing
   */
  public_key: string;

  /**
   * Signature of the message
   */
  signature: string;

  /**
   * Message that was signed
   */
  message: string;

  /**
   * Nonce used for signing
   */
  nonce: string;

  /**
   * Recipient of the message
   */
  recipient?: string;

  /**
   * Callback URL
   */
  callback_url?: string;
}

/**
 * NEAR Authentication Payload
 */
export interface NearAuthPayload {
  /**
   * Tag value for the payload (2147484061)
   */
  tag: number;

  /**
   * Message that was signed
   */
  message: string;

  /**
   * Nonce used for signing
   */
  nonce: Uint8Array;

  /**
   * Recipient of the message
   */
  receiver: string;

  /**
   * Callback URL
   */
  callback_url?: string;
}

/**
 * Signature result
 */
export interface SignatureResult {
  /**
   * NEAR account ID
   */
  accountId: string;

  /**
   * Public key used for signing
   */
  publicKey: string;

  /**
   * Signature of the message
   */
  signature: string;

  /**
   * Message that was signed
   */
  message: string;

  /**
   * Nonce used for signing
   */
  nonce: string;

  /**
   * Recipient of the message
   */
  recipient: string;

  /**
   * Callback URL
   */
  callbackUrl?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether the signature is valid
   */
  valid: boolean;

  /**
   * Error message if invalid
   */
  error?: string;
}
