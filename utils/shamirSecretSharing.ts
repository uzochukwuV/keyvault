import { randomBytes } from 'crypto';

/**
 * Galois Field (GF) 256 arithmetic operations for Shamir Secret Sharing
 */
class GF256 {
  // Precomputed logarithm and exponential tables for GF(256)
  private static LOG_TABLE: number[] = [];
  private static EXP_TABLE: number[] = [];

  static {
    // Initialize GF(256) tables
    this.initializeTables();
  }

  private static initializeTables() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.EXP_TABLE[i] = x;
      this.LOG_TABLE[x] = i;
      x = this.multiplyPrimitive(x, 3); // Generator polynomial
    }
    this.EXP_TABLE[255] = this.EXP_TABLE[0]; // Wrap around
  }

  private static multiplyPrimitive(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    let result = 0;
    while (b > 0) {
      if (b & 1) {
        result ^= a;
      }
      a <<= 1;
      if (a & 0x100) {
        a ^= 0x11b; // GF(256) irreducible polynomial
      }
      b >>= 1;
    }
    return result;
  }

  static multiply(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.EXP_TABLE[(this.LOG_TABLE[a] + this.LOG_TABLE[b]) % 255];
  }

  static add(a: number, b: number): number {
    return a ^ b; // XOR operation in GF(256)
  }

  static divide(a: number, b: number): number {
    if (a === 0) return 0;
    if (b === 0) throw new Error('Division by zero in GF(256)');
    return this.EXP_TABLE[(this.LOG_TABLE[a] - this.LOG_TABLE[b] + 255) % 255];
  }

  static power(base: number, exp: number): number {
    if (base === 0) return 0;
    return this.EXP_TABLE[(this.LOG_TABLE[base] * exp) % 255];
  }
}

/**
 * Polynomial evaluation and operations in GF(256)
 */
class Polynomial {
  constructor(public coefficients: number[]) {}

  evaluate(x: number): number {
    let result = 0;
    let xPower = 1;

    for (const coeff of this.coefficients) {
      result = GF256.add(result, GF256.multiply(coeff, xPower));
      xPower = GF256.multiply(xPower, x);
    }

    return result;
  }

  static interpolate(points: Array<{ x: number; y: number }>): Polynomial {
    const n = points.length;
    let result = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let numerator = [points[i].y];
      let denominator = 1;

      for (let j = 0; j < n; j++) {
        if (i !== j) {
          // Multiply numerator by (x - points[j].x)
          const newNumerator = new Array(numerator.length + 1).fill(0);
          for (let k = 0; k < numerator.length; k++) {
            newNumerator[k] = GF256.add(newNumerator[k], GF256.multiply(numerator[k], GF256.add(0, points[j].x)));
            newNumerator[k + 1] = GF256.add(newNumerator[k + 1], numerator[k]);
          }
          numerator = newNumerator;

          // Multiply denominator by (points[i].x - points[j].x)
          denominator = GF256.multiply(denominator, GF256.add(points[i].x, points[j].x));
        }
      }

      // Divide numerator by denominator and add to result
      const invDenom = GF256.divide(1, denominator);
      for (let k = 0; k < numerator.length; k++) {
        result[k] = GF256.add(result[k], GF256.multiply(numerator[k], invDenom));
      }
    }

    return new Polynomial(result);
  }
}

export interface ShamirShare {
  x: number; // Share index (1-based)
  y: Uint8Array; // Share data
  threshold: number; // M (minimum shares needed)
  totalShares: number; // N (total shares created)
  keyId: string; // Identifier for the key
  timestamp: number; // When share was created
}

export interface ShamirConfig {
  threshold: number; // M in M-of-N
  totalShares: number; // N in M-of-N
  keyId: string;
}

/**
 * Shamir's Secret Sharing implementation
 * Splits a secret into N shares where M shares are required to reconstruct
 */
export class ShamirSecretSharing {
  /**
   * Split a secret into shares using Shamir's Secret Sharing
   * @param secret The secret to split (as bytes)
   * @param threshold Minimum number of shares required to reconstruct (M)
   * @param totalShares Total number of shares to generate (N)
   * @param keyId Identifier for the key being shared
   * @returns Array of shares
   */
  static splitSecret(
    secret: Uint8Array,
    threshold: number,
    totalShares: number,
    keyId: string
  ): ShamirShare[] {
    if (threshold < 2 || threshold > totalShares) {
      throw new Error('Invalid threshold: must be 2 <= threshold <= totalShares');
    }
    if (totalShares > 255) {
      throw new Error('Total shares cannot exceed 255');
    }
    if (secret.length === 0) {
      throw new Error('Secret cannot be empty');
    }

    const shares: ShamirShare[] = [];
    const timestamp = Date.now();

    // For each byte of the secret, create a polynomial and evaluate shares
    for (let shareIndex = 1; shareIndex <= totalShares; shareIndex++) {
      const shareData = new Uint8Array(secret.length);

      for (let byteIndex = 0; byteIndex < secret.length; byteIndex++) {
        // Create polynomial with secret byte as constant term
        const coefficients = [secret[byteIndex]];

        // Generate random coefficients for polynomial of degree (threshold - 1)
        for (let i = 1; i < threshold; i++) {
          coefficients.push(this.generateRandomByte());
        }

        const polynomial = new Polynomial(coefficients);
        shareData[byteIndex] = polynomial.evaluate(shareIndex);
      }

      shares.push({
        x: shareIndex,
        y: shareData,
        threshold,
        totalShares,
        keyId,
        timestamp
      });
    }

    return shares;
  }

  /**
   * Reconstruct the original secret from shares
   * @param shares Array of shares (must be >= threshold)
   * @returns Reconstructed secret
   */
  static reconstructSecret(shares: ShamirShare[]): Uint8Array {
    if (shares.length === 0) {
      throw new Error('No shares provided');
    }

    const firstShare = shares[0];
    const threshold = firstShare.threshold;
    const secretLength = firstShare.y.length;
    const keyId = firstShare.keyId;

    // Validate shares
    if (shares.length < threshold) {
      throw new Error(`Insufficient shares: need ${threshold}, got ${shares.length}`);
    }

    // Ensure all shares are for the same key and have same length
    for (const share of shares) {
      if (share.keyId !== keyId) {
        throw new Error('Shares are for different keys');
      }
      if (share.y.length !== secretLength) {
        throw new Error('Shares have different lengths');
      }
      if (share.threshold !== threshold) {
        throw new Error('Shares have different thresholds');
      }
    }

    // Take only the required number of shares
    const requiredShares = shares.slice(0, threshold);
    const reconstructedSecret = new Uint8Array(secretLength);

    // Reconstruct each byte of the secret
    for (let byteIndex = 0; byteIndex < secretLength; byteIndex++) {
      const points = requiredShares.map(share => ({
        x: share.x,
        y: share.y[byteIndex]
      }));

      // Use Lagrange interpolation to find the constant term
      reconstructedSecret[byteIndex] = this.lagrangeInterpolate(points, 0);
    }

    return reconstructedSecret;
  }

  /**
   * Validate a share against the original secret (for testing)
   * @param share The share to validate
   * @param originalSecret The original secret
   * @param allShares All shares generated from the secret
   * @returns True if share is valid
   */
  static validateShare(share: ShamirShare, originalSecret: Uint8Array, allShares: ShamirShare[]): boolean {
    try {
      // Find shares with same x-coordinate (should be unique)
      const duplicates = allShares.filter(s => s.x === share.x);
      if (duplicates.length !== 1) return false;

      // Reconstruct using this share + minimum required shares
      const testShares = [share, ...allShares.filter(s => s.x !== share.x).slice(0, share.threshold - 1)];
      const reconstructed = this.reconstructSecret(testShares);

      // Compare with original
      return this.arraysEqual(reconstructed, originalSecret);
    } catch {
      return false;
    }
  }

  /**
   * Generate cryptographically secure random byte
   */
  private static generateRandomByte(): number {
    return randomBytes(1)[0];
  }

  /**
   * Lagrange interpolation to find polynomial value at x=0 (constant term)
   */
  private static lagrangeInterpolate(points: Array<{ x: number; y: number }>, x: number): number {
    let result = 0;

    for (let i = 0; i < points.length; i++) {
      let numerator = 1;
      let denominator = 1;

      for (let j = 0; j < points.length; j++) {
        if (i !== j) {
          numerator = GF256.multiply(numerator, GF256.add(x, points[j].x));
          denominator = GF256.multiply(denominator, GF256.add(points[i].x, points[j].x));
        }
      }

      const lagrangeBasis = GF256.divide(numerator, denominator);
      result = GF256.add(result, GF256.multiply(points[i].y, lagrangeBasis));
    }

    return result;
  }

  /**
   * Compare two Uint8Arrays for equality
   */
  private static arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * Convert share to base64 string for storage
   */
  static shareToString(share: ShamirShare): string {
    const shareData = {
      x: share.x,
      y: Array.from(share.y),
      threshold: share.threshold,
      totalShares: share.totalShares,
      keyId: share.keyId,
      timestamp: share.timestamp
    };
    return Buffer.from(JSON.stringify(shareData)).toString('base64');
  }

  /**
   * Parse share from base64 string
   */
  static shareFromString(shareString: string): ShamirShare {
    try {
      const shareData = JSON.parse(Buffer.from(shareString, 'base64').toString());
      return {
        x: shareData.x,
        y: new Uint8Array(shareData.y),
        threshold: shareData.threshold,
        totalShares: shareData.totalShares,
        keyId: shareData.keyId,
        timestamp: shareData.timestamp
      };
    } catch (error) {
      throw new Error('Invalid share string format');
    }
  }

  /**
   * Generate a secure random key for testing
   */
  static generateTestKey(length: number = 32): Uint8Array {
    return randomBytes(length);
  }
}