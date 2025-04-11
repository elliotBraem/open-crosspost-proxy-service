/**
 * NearSigner class for generating NEAR wallet signatures
 * Compatible with both Node.js and Deno environments
 */

// Use environment-specific imports
// For Node.js (will be transformed for Deno)
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import * as borsh from 'borsh';
import {
  NearAuthData,
  NearAuthPayload,
  NearSignerOptions,
  SignatureResult,
  ValidationResult,
} from '../types';
import {
  base64ToUint8Array,
  createAuthHeader,
  generateNonce,
  stringToUint8Array,
  uint8ArrayToBase64,
  validateNonce,
} from '../utils/index';

/**
 * Environment detection
 */
const isDeno = typeof Deno !== 'undefined';
const isBrowser = typeof window !== 'undefined';

/**
 * NearSigner class for generating NEAR wallet signatures
 * Works in both Node.js and Deno environments, as well as browser and server contexts
 */
export class NearSigner {
  private readonly options: NearSignerOptions;
  private account: { accountId: string; publicKey: string } | null = null;
  private readonly ED25519_PREFIX = 'ed25519:';
  private readonly TAG = 2147484061;
  private readonly DEFAULT_RECIPIENT = 'crosspost.near';

  /**
   * Constructor
   * @param options NearSigner options
   */
  constructor(options: NearSignerOptions) {
    this.options = {
      ...options,
      defaultRecipient: options.defaultRecipient || this.DEFAULT_RECIPIENT,
    };

    // If accountId and keyPair are provided, set the account
    if (options.accountId && options.keyPair) {
      this.account = {
        accountId: options.accountId,
        publicKey: options.keyPair.getPublicKey().toString(),
      };
    }
  }

  /**
   * Connect to NEAR wallet
   * @returns Connected account
   */
  async connect(): Promise<{ accountId: string; publicKey: string }> {
    // Browser environment - use wallet connection
    if (isBrowser) {
      // This is a placeholder for actual wallet connection logic
      // In a real implementation, this would use near-api-js or wallet-selector
      console.warn(
        'NearSigner.connect() in browser is a placeholder. Implement actual wallet connection logic.',
      );

      // Simulate a successful connection
      this.account = {
        accountId: 'example.testnet',
        publicKey: 'ed25519:8hSHprDq2StXwMtNd43wDTXQYsjXcD4MJxUTvwtnmM4T',
      };
    } // Server environment - use provided key pair
    else {
      if (!this.options.accountId || !this.options.keyPair) {
        throw new Error('accountId and keyPair are required for connect() in server environment');
      }

      this.account = {
        accountId: this.options.accountId,
        publicKey: this.options.keyPair.getPublicKey().toString(),
      };
    }

    return this.account;
  }

  /**
   * Get the connected account
   * @returns Connected account or null if not connected
   */
  getAccount(): { accountId: string; publicKey: string } | null {
    return this.account;
  }

  /**
   * Sign a message
   * @param message Message to sign
   * @param recipient Recipient of the message (default: options.defaultRecipient)
   * @param callbackUrl Callback URL (optional)
   * @returns Signature result
   */
  async sign(
    message: string,
    recipient?: string,
    callbackUrl?: string,
  ): Promise<SignatureResult> {
    if (!this.account) {
      throw new Error('Not connected to NEAR wallet');
    }

    const nonce = generateNonce();
    const nonceBytes = this.padNonce(nonce);
    const actualRecipient = recipient || this.options.defaultRecipient || this.DEFAULT_RECIPIENT;

    // Create payload
    const payload: NearAuthPayload = {
      tag: this.TAG,
      message,
      nonce: nonceBytes,
      receiver: actualRecipient,
      callback_url: callbackUrl,
    };

    // Serialize payload
    const serializedPayload = await this.serializePayload(payload);

    // Hash the payload
    const payloadHash = await this.hashPayload(serializedPayload);

    // Sign the hash
    const signature = await this.signHash(payloadHash);

    return {
      accountId: this.account.accountId,
      publicKey: this.account.publicKey,
      signature,
      message,
      nonce,
      recipient: actualRecipient,
      callbackUrl,
    };
  }

  /**
   * Create an authentication header for the Crosspost API
   * @param message Message to sign
   * @param recipient Recipient of the message (default: options.defaultRecipient)
   * @param callbackUrl Callback URL (optional)
   * @returns Auth header string
   */
  async createAuthHeader(
    message: string,
    recipient?: string,
    callbackUrl?: string,
  ): Promise<string> {
    const signatureResult = await this.sign(message, recipient, callbackUrl);

    const authData: NearAuthData = {
      account_id: signatureResult.accountId,
      public_key: signatureResult.publicKey,
      signature: signatureResult.signature,
      message: signatureResult.message,
      nonce: signatureResult.nonce,
      recipient: signatureResult.recipient,
      callback_url: signatureResult.callbackUrl,
    };

    return createAuthHeader(authData);
  }

  /**
   * Validate a signature
   * @param signature Signature to validate
   * @param message Message that was signed
   * @param publicKey Public key to validate against
   * @param nonce Nonce used for signing
   * @param recipient Recipient of the message
   * @returns Validation result
   */
  async validateSignature(
    signature: string,
    message: string,
    publicKey: string,
    nonce: string,
    recipient: string = this.DEFAULT_RECIPIENT,
  ): Promise<ValidationResult> {
    try {
      // Validate nonce
      const nonceValidation = validateNonce(nonce);
      if (!nonceValidation.valid) {
        return nonceValidation;
      }

      const nonceBytes = this.padNonce(nonce);

      // Create payload
      const payload: NearAuthPayload = {
        tag: this.TAG,
        message,
        nonce: nonceBytes,
        receiver: recipient,
      };

      // Serialize payload
      const serializedPayload = await this.serializePayload(payload);

      // Hash the payload
      const payloadHash = await this.hashPayload(serializedPayload);

      // Decode the signature
      const signatureBytes = base64ToUint8Array(signature);

      // Decode the public key (remove ed25519: prefix if present)
      const publicKeyString = publicKey.startsWith(this.ED25519_PREFIX)
        ? publicKey.substring(this.ED25519_PREFIX.length)
        : publicKey;

      // Use bs58 to decode the public key
      const publicKeyBytes = bs58.decode(publicKeyString);

      // Verify the signature
      const isValid = nacl.sign.detached.verify(payloadHash, signatureBytes, publicKeyBytes);

      return {
        valid: isValid,
        error: isValid ? undefined : 'Invalid signature',
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error validating signature',
      };
    }
  }

  /**
   * Pad a nonce to 32 bytes
   * @param nonce Nonce string
   * @returns Padded nonce as Uint8Array
   */
  private padNonce(nonce: string): Uint8Array {
    // Convert nonce to a proper format (padded to 32 bytes)
    const paddedNonce = nonce.padStart(32, '0');
    return stringToUint8Array(paddedNonce);
  }

  /**
   * Serialize a payload using Borsh
   * @param payload Payload to serialize
   * @returns Serialized payload as Uint8Array
   */
  private async serializePayload(payload: NearAuthPayload): Promise<Uint8Array> {
    // Create a properly formatted payload object
    const borshPayload = {
      tag: payload.tag,
      message: payload.message,
      nonce: Array.from(payload.nonce), // Convert Uint8Array to array for serialization
      receiver: payload.receiver,
      callback_url: payload.callback_url || null,
    };

    // Define the schema for borsh
    const schema = {
      struct: {
        tag: 'u32',
        message: 'string',
        nonce: { array: { type: 'u8', len: 32 } }, // Fixed-length array of 32 bytes
        receiver: 'string',
        callback_url: { option: 'string' },
      },
    };

    // Serialize using borsh
    return borsh.serialize(schema, borshPayload);
  }

  /**
   * Hash a payload
   * @param payload Payload to hash
   * @returns Hashed payload as Uint8Array
   */
  private async hashPayload(payload: Uint8Array): Promise<Uint8Array> {
    // Use the appropriate crypto API based on the environment
    if (isBrowser || isDeno) {
      // Browser and Deno environments have crypto.subtle
      const hashBuffer = await crypto.subtle.digest('SHA-256', payload);
      return new Uint8Array(hashBuffer);
    } else {
      // Node.js environment
      try {
        // Try to use Node.js crypto module
        const nodeCrypto = await import('node:crypto');
        const hash = nodeCrypto.createHash('sha256');
        // Use Uint8Array directly instead of Buffer
        hash.update(new Uint8Array(payload));
        return new Uint8Array(hash.digest());
      } catch (error) {
        // Fallback to a simple hash implementation if crypto is not available
        console.warn('Node.js crypto module not available, using fallback hash implementation');
        return this.fallbackHash(payload);
      }
    }
  }

  /**
   * Fallback hash implementation for environments without crypto
   * @param payload Payload to hash
   * @returns Hashed payload as Uint8Array
   */
  private fallbackHash(payload: Uint8Array): Uint8Array {
    // This is a very simple hash function and should not be used in production
    // It's only here as a last resort fallback
    const result = new Uint8Array(32);
    for (let i = 0; i < payload.length; i++) {
      result[i % 32] = (result[i % 32] + payload[i]) % 256;
    }
    return result;
  }

  /**
   * Sign a hash
   * @param hash Hash to sign
   * @returns Signature as base64 string
   */
  private async signHash(hash: Uint8Array): Promise<string> {
    // Browser environment - use wallet's signing capability
    if (isBrowser && !this.options.keyPair) {
      // This is a placeholder for actual browser wallet signing logic
      console.warn(
        'signHash() in browser is a placeholder. Implement actual wallet signing logic.',
      );

      // Simulate signing with a random signature
      const randomSignature = nacl.randomBytes(64);
      return uint8ArrayToBase64(randomSignature);
    } // Server environment or browser with keyPair - use provided key pair
    else if (this.options.keyPair) {
      try {
        // Use the keyPair to sign the hash
        // This assumes keyPair has a sign method that takes a Uint8Array and returns a Uint8Array
        const signature = this.options.keyPair.sign(hash);
        return uint8ArrayToBase64(signature);
      } catch (error) {
        console.error('Error signing with keyPair:', error);
        throw new Error('Failed to sign with provided keyPair');
      }
    } else {
      throw new Error('No signing method available. Provide a keyPair for server-side signing.');
    }
  }
}
