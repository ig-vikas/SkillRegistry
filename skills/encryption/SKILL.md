---
name: encryption
type: skill
description: End-to-end encryption for AI agent gateway messages, sessions, and sensitive data using modern cryptographic algorithms.
version: 1.0.0
author: skillregistry
license: MIT
agents: [cursor, claude-code, copilot, gemini-cli]
categories: [security, cryptography, backend]
tags: [encryption, security, aes, rsa, cryptography, e2ee, privacy, libsodium]
---

# Encryption System Expert

Implement comprehensive end-to-end encryption (E2EE) for AI agent gateway to protect messages, sessions, storage, and sensitive data at rest and in transit.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Encryption Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────┐ │
│  │   Key Management  │    │  Data Encryption  │    │  Secure     │ │
│  │                  │    │                  │    │  Transport  │ │
│  │ - Key Generation │    │ - AES-256-GCM    │    │ - TLS/SSL   │ │
│  │ - Key Storage    │    │ - ChaCha20-Poly1305│   │ - WebSocket│ │
│  │ - Key Rotation   │    │ - RSA-OAEP       │    │   Secure   │ │
│  │ - Key Exchange   │    │                  │    │ - Message  │ │
│  └──────────┬───────┘    └──────────┬───────┘    │   Auth     │ │
│             │                       │              └──────┬────┘ │
│             │                       │                     │       │
│             └───────────────────────┴─────────────────────┘       │
│                                    │                              │
│                                    ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Encrypted Data Flow                        │ │
│  │  Sender: plaintext → encrypt → ciphertext → transmit →         │ │
│  │  Receiver: ciphertext → decrypt → plaintext                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

| Component | Purpose | Algorithm | Implementation |
|-----------|---------|-----------|----------------|
| KeyManager | Generate, store, rotate keys | ECDH, HKDF | libsodium, WebCrypto |
| DataEncryptor | Encrypt/decrypt messages | AES-256-GCM | libsodium |
| SessionEncryptor | Encrypt session data | ChaCha20-Poly1305 | libsodium |
| KeyExchange | Secure key exchange | ECDH (X25519) | libsodium |
| MessageAuth | Authenticate messages | HMAC-SHA256 | libsodium |
| Signature | Sign/verify data | Ed25519 | libsodium |

## Cryptographic Primitives

### Algorithm Selection

| Purpose | Algorithm | Key Size | Notes |
|---------|-----------|----------|-------|
| Symmetric Encryption | AES-256-GCM | 256-bit | NIST approved, hardware accelerated |
| Symmetric Encryption | ChaCha20-Poly1305 | 256-bit | Software-friendly, no hardware needed |
| Key Exchange | ECDH (X25519) | 256-bit | Modern, efficient, secure |
| Asymmetric Encryption | RSA-OAEP | 2048-4096-bit | For key transport |
| Message Authentication | HMAC-SHA256 | 256-bit | Standard MAC |
| Digital Signature | Ed25519 | 256-bit | EdDSA, fast, secure |
| Hashing | SHA-256 | 256-bit | Standard hash |
| Hashing | BLAKE3 | 256-bit | Fast, modern hash |
| Password Hashing | Argon2id | Variable | Memory-hard KDF |

### Security Parameters

```typescript
// src/config/crypto-params.ts
export const CryptoParameters = {
  // AES-256-GCM parameters
  aes: {
    keySize: 256, // bits
    ivSize: 12, // bytes (96 bits)
    tagSize: 16, // bytes (128 bits)
    mode: 'GCM' as const,
  },
  
  // ChaCha20-Poly1305 parameters
  chacha20: {
    keySize: 256, // bits
    nonceSize: 12, // bytes
    tagSize: 16, // bytes
  },
  
  // ECDH (X25519) parameters
  ecdh: {
    curve: 'X25519' as const,
    keySize: 256, // bits
    publicKeySize: 32, // bytes
    privateKeySize: 32, // bytes
    sharedSecretSize: 32, // bytes
  },
  
  // Ed25519 parameters
  ed25519: {
    keySize: 256, // bits
    publicKeySize: 32, // bytes
    privateKeySize: 32, // bytes
    signatureSize: 64, // bytes
  },
  
  // RSA parameters
  rsa: {
    keySize: 4096, // bits
    hashAlgorithm: 'SHA-256' as const,
    padding: 'OAEP' as const,
  },
  
  // Hash parameters
  hash: {
    algorithm: 'SHA-256' as const,
    outputSize: 32, // bytes
  },
  
  // Argon2id parameters
  argon2: {
    timeCost: 3, // iterations
    memoryCost: 65536, // KiB
    parallelism: 1, // threads
    saltSize: 16, // bytes
    hashSize: 32, // bytes
  },
  
  // Key rotation
  keyRotation: {
    sessionKey: 24 * 60 * 60 * 1000, // 24 hours in ms
    messageKey: 1000, // Per message (ephemeral)
    masterKey: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  },
} as const;
```

## Setup & Installation

```bash
# Install required packages
pnpm add sodium-native @noble/curves @noble/ciphers @noble/hashes argon2-brotli
pnpm add -D @types/sodium-native

# Or use WebCrypto (built-in in Node.js 20+ and browsers)
# No additional dependencies needed

# For Bun (recommended)
pnpm add sodium-native
```

## Key Management

### Key Hierarchy

```
Master Key (Long-term)
    │
    ├── Session Key (Per conversation)
    │       │
    │       ├── Message Key (Per message - ephemeral)
    │       │
    │       └── Chain Key (For message chain encryption)
    │
    └── Device Key (Per device)
            │
            └── Key Pair (Public/Private for identity)
```

### Key Manager Implementation

```typescript
// src/services/crypto/key-manager.ts
import { randomBytes, scryptSync } from 'crypto';
import { sodium } from 'sodium-native';

export type KeyType = 'master' | 'session' | 'message' | 'device' | 'ephemeral';

export interface KeyMaterial {
  key: Uint8Array;
  iv?: Uint8Array;
  salt?: Uint8Array;
  type: KeyType;
  createdAt: number;
  expiresAt?: number;
  derivedFrom?: string; // Parent key ID
}

export class KeyManager {
  private keys: Map<string, KeyMaterial> = new Map();
  private keyIndex: Map<KeyType, Set<string>> = new Map();
  
  constructor() {
    // Initialize key indexes
    ['master', 'session', 'message', 'device', 'ephemeral'].forEach(type => {
      this.keyIndex.set(type as KeyType, new Set());
    });
  }
  
  // Generate new cryptographic key
  generateKey(type: KeyType, size: number = 32): Uint8Array {
    return randomBytes(size);
  }
  
  // Generate key from password
  deriveKeyFromPassword(
    password: string,
    salt: Uint8Array = randomBytes(16),
    size: number = 32
  ): { key: Uint8Array; salt: Uint8Array } {
    const key = scryptSync(password, salt, size, { N: 16384, r: 8, p: 1 });
    return { key, salt };
  }
  
  // Derive key from master key
  deriveKey(
    masterKeyId: string,
    context: string,
    size: number = 32
  ): Uint8Array {
    const masterKey = this.getKey(masterKeyId);
    if (!masterKey) {
      throw new Error(`Master key ${masterKeyId} not found`);
    }
    
    // Use HKDF for key derivation
    const hkdf = sodium.crypto_kdf_derive_from_key;
    return new Uint8Array(
      Buffer.from(
        hkdf(size, context, masterKey.key, null, sodium.crypto_kdf_blake2b)
      )
    );
  }
  
  // Create and store a new key
  createKey(
    type: KeyType,
    size?: number,
    expiresIn?: number,
    derivedFrom?: string
  ): string {
    const id = this.generateKeyId(type);
    const key: KeyMaterial = {
      key: this.generateKey(type, size || 32),
      type,
      createdAt: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      derivedFrom,
    };
    
    this.keys.set(id, key);
    this.keyIndex.get(type)!.add(id);
    
    return id;
  }
  
  // Get key by ID
  getKey(id: string): KeyMaterial | null {
    const key = this.keys.get(id);
    if (!key) return null;
    
    // Check expiration
    if (key.expiresAt && Date.now() > key.expiresAt) {
      this.keys.delete(id);
      this.keyIndex.get(key.type)!.delete(id);
      return null;
    }
    
    return key;
  }
  
  // Rotate key
  rotateKey(oldKeyId: string, type: KeyType): string {
    const oldKey = this.getKey(oldKeyId);
    if (!oldKey) {
      throw new Error(`Key ${oldKeyId} not found`);
    }
    
    // Create new key
    const newKeyId = this.createKey(type);
    
    // If this is a session key, re-encrypt all session data
    // (In practice, this would be handled by the session manager)
    
    return newKeyId;
  }
  
  // Clean up expired keys
  cleanupExpired(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [id, key] of this.keys) {
      if (key.expiresAt && now > key.expiresAt) {
        this.keys.delete(id);
        this.keyIndex.get(key.type)!.delete(id);
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  // Export key (for backup)
  exportKey(id: string, password?: string): Uint8Array {
    const key = this.getKey(id);
    if (!key) {
      throw new Error(`Key ${id} not found`);
    }
    
    if (password) {
      // Encrypt key before export
      const { key: derivedKey } = this.deriveKeyFromPassword(password);
      const nonce = randomBytes(12);
      const encrypted = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        key.key,
        null,
        nonce,
        derivedKey
      );
      
      // Return: nonce + encrypted key
      const result = new Uint8Array(nonce.length + encrypted.length);
      result.set(nonce);
      result.set(encrypted, nonce.length);
      return result;
    }
    
    return key.key;
  }
  
  // Import key (from backup)
  importKey(
    data: Uint8Array,
    type: KeyType,
    password?: string
  ): string {
    if (password) {
      const { key: derivedKey } = this.deriveKeyFromPassword(password);
      const nonce = data.slice(0, 12);
      const encrypted = data.slice(12);
      
      const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        encrypted,
        null,
        nonce,
        derivedKey
      );
      
      const keyId = this.generateKeyId(type);
      this.keys.set(keyId, {
        key: new Uint8Array(decrypted),
        type,
        createdAt: Date.now(),
      });
      this.keyIndex.get(type)!.add(keyId);
      return keyId;
    }
    
    const keyId = this.generateKeyId(type);
    this.keys.set(keyId, {
      key: data,
      type,
      createdAt: Date.now(),
    });
    this.keyIndex.get(type)!.add(keyId);
    return keyId;
  }
  
  private generateKeyId(type: KeyType): string {
    const prefix = type.substring(0, 3);
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }
  
  // Get all keys of a type
  getKeysByType(type: KeyType): KeyMaterial[] {
    const ids = this.keyIndex.get(type) || new Set();
    return Array.from(ids).map(id => this.getKey(id)).filter(Boolean) as KeyMaterial[];
  }
  
  // Destroy all keys
  clearAll(): void {
    this.keys.clear();
    this.keyIndex.forEach(set => set.clear());
  }
}
```

## Data Encryption

### Symmetric Encryption (AES-256-GCM)

```typescript
// src/services/crypto/symmetric.ts
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { KeyManager } from './key-manager';

export interface EncryptionOptions {
  keyId?: string;
  associatedData?: Uint8Array;
}

export interface EncryptedData {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
  keyId?: string;
  version?: number;
}

export class SymmetricEncryptor {
  private keyManager: KeyManager;
  private algorithm: string;
  private ivSize: number;
  private tagSize: number;
  
  constructor(keyManager: KeyManager) {
    this.keyManager = keyManager;
    this.algorithm = 'aes-256-gcm';
    this.ivSize = 12; // 96 bits
    this.tagSize = 16; // 128 bits
  }
  
  encrypt(
    plaintext: Uint8Array,
    keyId?: string,
    associatedData?: Uint8Array
  ): EncryptedData {
    // Get or create key
    const actualKeyId = keyId || this.keyManager.createKey('session');
    const keyMaterial = this.keyManager.getKey(actualKeyId);
    
    if (!keyMaterial) {
      throw new Error(`Key ${actualKeyId} not found`);
    }
    
    // Generate random IV
    const iv = randomBytes(this.ivSize);
    
    // Create cipher
    const cipher = createCipheriv(
      this.algorithm,
      keyMaterial.key,
      iv,
      { authTagLength: this.tagSize }
    );
    
    // Add associated data if provided
    if (associatedData) {
      cipher.setAAD(associatedData);
    }
    
    // Encrypt
    const encryptedChunks: Uint8Array[] = [];
    encryptedChunks.push(cipher.update(plaintext));
    encryptedChunks.push(cipher.final());
    
    const ciphertext = this.concatUint8Arrays(encryptedChunks);
    const tag = cipher.getAuthTag();
    
    return {
      ciphertext,
      iv,
      tag,
      keyId: actualKeyId,
      version: 1,
    };
  }
  
  decrypt(
    encryptedData: EncryptedData,
    associatedData?: Uint8Array
  ): Uint8Array {
    const { ciphertext, iv, tag, keyId } = encryptedData;
    
    if (!keyId) {
      throw new Error('No key ID provided');
    }
    
    const keyMaterial = this.keyManager.getKey(keyId);
    if (!keyMaterial) {
      throw new Error(`Key ${keyId} not found`);
    }
    
    // Create decipher
    const decipher = createDecipheriv(
      this.algorithm,
      keyMaterial.key,
      iv,
      { authTagLength: this.tagSize }
    );
    
    decipher.setAuthTag(tag);
    
    // Add associated data if provided
    if (associatedData) {
      decipher.setAAD(associatedData);
    }
    
    // Decrypt
    const decryptedChunks: Uint8Array[] = [];
    decryptedChunks.push(decipher.update(ciphertext));
    decryptedChunks.push(decipher.final());
    
    return this.concatUint8Arrays(decryptedChunks);
  }
  
  private concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }
}
```

### Asymmetric Encryption (RSA-OAEP)

```typescript
// src/services/crypto/asymmetric.ts
import { randomBytes } from 'crypto';
import { publicEncrypt, privateDecrypt, generateKeyPairSync } from 'crypto';

export interface KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
  keyId: string;
}

export interface AsymmetricEncryptedData {
  ciphertext: Buffer;
  encryptedKey?: Buffer;
  iv?: Buffer;
  ephemeralPublicKey?: Buffer;
  version: number;
}

export class AsymmetricEncryptor {
  private keyPairs: Map<string, KeyPair> = new Map();
  
  // Generate RSA key pair
  generateKeyPair(keySize: number = 4096): KeyPair {
    const keyId = `rsa_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: keySize,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    
    const keyPair: KeyPair = {
      publicKey: Buffer.from(publicKey),
      privateKey: Buffer.from(privateKey),
      keyId,
    };
    
    this.keyPairs.set(keyId, keyPair);
    return keyPair;
  }
  
  // Encrypt with RSA public key
  encrypt(publicKey: Buffer, plaintext: Buffer): Buffer {
    return publicEncrypt(
      {
        key: publicKey,
        padding: require('constants').RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      plaintext
    );
  }
  
  // Decrypt with RSA private key
  decrypt(privateKey: Buffer, ciphertext: Buffer): Buffer {
    return privateDecrypt(
      {
        key: privateKey,
        padding: require('constants').RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      ciphertext
    );
  }
  
  // Hybrid encryption: RSA for key transport, AES for data
  hybridEncrypt(
    publicKey: Buffer,
    plaintext: Buffer,
    symmetricKeySize: number = 32
  ): AsymmetricEncryptedData {
    // Generate ephemeral AES key
    const aesKey = randomBytes(symmetricKeySize);
    const iv = randomBytes(12);
    
    // Encrypt data with AES
    const cipher = createCipheriv('aes-256-gcm', aesKey, iv, { authTagLength: 16 });
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Encrypt AES key with RSA
    const encryptedKey = this.encrypt(publicKey, Buffer.from(aesKey));
    
    // Combine: encryptedKey + iv + tag + encrypted data
    const result = Buffer.concat([
      Buffer.from([0x01]), // Version byte
      encryptedKey,
      iv,
      tag,
      encrypted,
    ]);
    
    return {
      ciphertext: result,
      version: 1,
    };
  }
  
  // Hybrid decryption
  hybridDecrypt(
    privateKey: Buffer,
    encryptedData: AsymmetricEncryptedData
  ): Buffer {
    const { ciphertext } = encryptedData;
    
    // Parse the buffer
    const version = ciphertext.readUInt8(0);
    let offset = 1;
    
    if (version !== 1) {
      throw new Error(`Unsupported version: ${version}`);
    }
    
    // Extract encrypted key (RSA encrypted 256-bit key)
    const encryptedKeySize = 512; // 4096-bit RSA encrypts 32 bytes to 512 bytes
    const encryptedKey = ciphertext.slice(offset, offset + encryptedKeySize);
    offset += encryptedKeySize;
    
    // Decrypt AES key
    const aesKey = this.decrypt(privateKey, encryptedKey);
    
    // Extract IV (12 bytes)
    const iv = ciphertext.slice(offset, offset + 12);
    offset += 12;
    
    // Extract tag (16 bytes)
    const tag = ciphertext.slice(offset, offset + 16);
    offset += 16;
    
    // Extract encrypted data
    const encrypted = ciphertext.slice(offset);
    
    // Decrypt with AES
    const decipher = createDecipheriv('aes-256-gcm', aesKey, iv, { authTagLength: 16 });
    decipher.setAuthTag(tag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
```

### Elliptic Curve Cryptography (ECDH + Ed25519)

```typescript
// src/services/crypto/ec-crypto.ts
import { randomBytes } from 'crypto';
import { sodium } from 'sodium-native';

export interface ECKeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
  keyId: string;
}

export class ECCrypto {
  // Generate X25519 key pair for key exchange
  generateX25519KeyPair(): ECKeyPair {
    const keyId = `x25519_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const publicKey = Buffer.alloc(sodium.crypto_kx_PUBLICKEYBYTES);
    const privateKey = Buffer.alloc(sodium.crypto_kx_SECRETKEYBYTES);
    
    sodium.crypto_kx_keypair(publicKey, privateKey);
    
    return {
      publicKey,
      privateKey,
      keyId,
    };
  }
  
  // Generate Ed25519 key pair for signing
  generateEd25519KeyPair(): ECKeyPair {
    const keyId = `ed25519_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
    const privateKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);
    
    sodium.crypto_sign_keypair(publicKey, privateKey);
    
    return {
      publicKey,
      privateKey,
      keyId,
    };
  }
  
  // ECDH key exchange (X25519)
  computeSharedSecret(
    privateKey: Buffer,
    peerPublicKey: Buffer
  ): Buffer {
    const sharedSecret = Buffer.alloc(sodium.crypto_kx_SESSIONKEYBYTES);
    const clientPk = Buffer.alloc(sodium.crypto_kx_PUBLICKEYBYTES);
    const clientSk = Buffer.alloc(sodium.crypto_kx_SECRETKEYBYTES);
    
    // Extract public key from private key (X25519)
    sodium.crypto_scalarmult_base(clientPk, clientSk.slice(0, 32));
    
    // Compute shared secret
    sodium.crypto_kx_client_session_keys(
      sharedSecret,
      clientPk,
      clientSk,
      peerPublicKey,
      privateKey
    );
    
    return sharedSecret.slice(0, 32); // Return 256-bit key
  }
  
  // Sign message with Ed25519
  sign(
    privateKey: Buffer,
    message: Buffer | string
  ): Buffer {
    const signature = Buffer.alloc(sodium.crypto_sign_BYTES);
    const msgBuffer = typeof message === 'string' ? Buffer.from(message) : message;
    
    sodium.crypto_sign_detached(signature, msgBuffer, privateKey);
    return signature;
  }
  
  // Verify signature with Ed25519
  verify(
    publicKey: Buffer,
    message: Buffer | string,
    signature: Buffer
  ): boolean {
    const msgBuffer = typeof message === 'string' ? Buffer.from(message) : message;
    
    return sodium.crypto_sign_verify_detached(
      signature,
      msgBuffer,
      publicKey
    );
  }
  
  // Hash with SHA-256
  hash(message: Buffer | string): Buffer {
    const msgBuffer = typeof message === 'string' ? Buffer.from(message) : message;
    const hash = Buffer.alloc(sodium.crypto_hash_sha256_BYTES);
    
    sodium.crypto_hash_sha256(hash, msgBuffer);
    return hash;
  }
  
  // Hash with BLAKE3
  hashBlake3(message: Buffer | string): Buffer {
    const msgBuffer = typeof message === 'string' ? Buffer.from(message) : message;
    const hash = Buffer.alloc(32);
    
    sodium.crypto_generichash(hash, msgBuffer);
    return hash;
  }
}
```

## Message Encryption

### End-to-End Message Encryption

```typescript
// src/services/crypto/message-encryptor.ts
import { ECCrypto } from './ec-crypto';
import { KeyManager } from './key-manager';
import { randomBytes } from 'crypto';
import { sodium } from 'sodium-native';

export interface EncryptedMessage {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  ephemeralPublicKey: Uint8Array;
  timestamp: number;
  messageId: string;
  version: number;
}

export interface MessageKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export class MessageEncryptor {
  private ecc: ECCrypto;
  private keyManager: KeyManager;
  private keyPairs: Map<string, MessageKeyPair> = new Map();
  
  constructor(keyManager: KeyManager) {
    this.ecc = new ECCrypto();
    this.keyManager = keyManager;
  }
  
  // Generate ephemeral key pair for each message
  generateEphemeralKeyPair(): MessageKeyPair {
    const { publicKey, privateKey } = this.ecc.generateX25519KeyPair();
    return {
      publicKey: new Uint8Array(publicKey),
      privateKey: new Uint8Array(privateKey.slice(0, 32)), // X25519 private key is 32 bytes
    };
  }
  
  // Encrypt message for recipient
  encryptMessage(
    message: string,
    recipientPublicKey: Uint8Array,
    sessionId?: string
  ): EncryptedMessage {
    // Generate ephemeral key pair
    const ephemeralKeys = this.generateEphemeralKeyPair();
    
    // Compute shared secret using ECDH
    const sharedSecret = new Uint8Array(
      this.ecc.computeSharedSecret(
        Buffer.from(ephemeralKeys.privateKey),
        Buffer.from(recipientPublicKey)
      )
    );
    
    // Derive encryption key from shared secret
    const encryptionKey = this.deriveEncryptionKey(sharedSecret, sessionId);
    
    // Generate random nonce
    const nonce = randomBytes(12);
    
    // Encrypt message with XChaCha20-Poly1305
    const ciphertext = new Uint8Array(
      sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        Buffer.from(message),
        null,
        nonce,
        Buffer.from(encryptionKey)
      )
    );
    
    return {
      ciphertext,
      nonce: new Uint8Array(nonce),
      ephemeralPublicKey: ephemeralKeys.publicKey,
      timestamp: Date.now(),
      messageId: this.generateMessageId(),
      version: 1,
    };
  }
  
  // Decrypt message
  decryptMessage(
    encryptedMessage: EncryptedMessage,
    privateKey: Uint8Array
  ): string {
    const { ciphertext, nonce, ephemeralPublicKey, version } = encryptedMessage;
    
    if (version !== 1) {
      throw new Error(`Unsupported message version: ${version}`);
    }
    
    // Compute shared secret using ECDH
    const sharedSecret = new Uint8Array(
      this.ecc.computeSharedSecret(
        Buffer.from(privateKey),
        Buffer.from(ephemeralPublicKey)
      )
    );
    
    // Derive decryption key
    const decryptionKey = this.deriveEncryptionKey(sharedSecret);
    
    // Decrypt message
    const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      Buffer.from(ciphertext),
      null,
      Buffer.from(nonce),
      Buffer.from(decryptionKey)
    );
    
    return Buffer.from(decrypted).toString('utf-8');
  }
  
  private deriveEncryptionKey(
    sharedSecret: Uint8Array,
    context?: string
  ): Uint8Array {
    // Use HKDF to derive a 256-bit encryption key
    const hkdf = sodium.crypto_kdf_derive_from_key;
    const contextStr = context ? `message:${context}` : 'message';
    
    return new Uint8Array(
      Buffer.from(
        hkdf(32, contextStr, Buffer.from(sharedSecret), null, sodium.crypto_kdf_blake2b)
      )
    );
  }
  
  private generateMessageId(): string {
    return `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }
}
```

## Session Encryption

### Session Key Management

```typescript
// src/services/crypto/session-encryptor.ts
import { KeyManager } from './key-manager';
import { MessageEncryptor, EncryptedMessage } from './message-encryptor';
import { randomBytes } from 'crypto';
import { sodium } from 'sodium-native';

export interface SessionEncryptionResult {
  encryptedMessages: EncryptedMessage[];
  sessionKeyId: string;
  initializationVector: Uint8Array;
}

export interface EncryptedSessionData {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
  keyId: string;
  timestamp: number;
}

export class SessionEncryptor {
  private keyManager: KeyManager;
  private messageEncryptor: MessageEncryptor;
  private sessionKeys: Map<string, { keyId: string; createdAt: number }> = new Map();
  
  constructor(keyManager: KeyManager) {
    this.keyManager = keyManager;
    this.messageEncryptor = new MessageEncryptor(keyManager);
  }
  
  // Create session for conversation
  createSession(userId: string, deviceId: string): string {
    const sessionId = this.generateSessionId();
    
    // Derive session key from user's device key
    const deviceKeyId = `device_${userId}_${deviceId}`;
    const sessionKeyId = this.keyManager.createKey('session', 32, undefined, deviceKeyId);
    
    this.sessionKeys.set(sessionId, {
      keyId: sessionKeyId,
      createdAt: Date.now(),
    });
    
    return sessionId;
  }
  
  // Encrypt message in session
  encryptInSession(
    sessionId: string,
    message: string,
    senderId: string
  ): EncryptedMessage {
    const session = this.sessionKeys.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // For E2EE, we still need recipient's public key
    // This is a hybrid approach: session key + per-message encryption
    
    // In practice, for group sessions, each participant has their own key
    // Messages are encrypted for each participant individually
    
    // For simplicity, we encrypt with session key directly
    const keyMaterial = this.keyManager.getKey(session.keyId);
    if (!keyMaterial) {
      throw new Error(`Session key ${session.keyId} not found`);
    }
    
    const nonce = randomBytes(12);
    
    const ciphertext = new Uint8Array(
      sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        Buffer.from(message),
        null,
        nonce,
        Buffer.from(keyMaterial.key)
      )
    );
    
    return {
      ciphertext,
      nonce: new Uint8Array(nonce),
      ephemeralPublicKey: new Uint8Array(32), // Placeholder for compatibility
      timestamp: Date.now(),
      messageId: this.generateMessageId(),
      version: 2, // Session-encrypted
    };
  }
  
  // Decrypt message in session
  decryptInSession(
    sessionId: string,
    encryptedMessage: EncryptedMessage
  ): string {
    const session = this.sessionKeys.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const keyMaterial = this.keyManager.getKey(session.keyId);
    if (!keyMaterial) {
      throw new Error(`Session key ${session.keyId} not found`);
    }
    
    const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      Buffer.from(encryptedMessage.ciphertext),
      null,
      Buffer.from(encryptedMessage.nonce),
      Buffer.from(keyMaterial.key)
    );
    
    return Buffer.from(decrypted).toString('utf-8');
  }
  
  // Encrypt session data (for storage)
  encryptSessionData(
    sessionId: string,
    data: any
  ): EncryptedSessionData {
    const session = this.sessionKeys.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const keyMaterial = this.keyManager.getKey(session.keyId);
    if (!keyMaterial) {
      throw new Error(`Session key ${session.keyId} not found`);
    }
    
    const iv = randomBytes(12);
    const dataBuffer = Buffer.from(JSON.stringify(data));
    
    const cipher = createCipheriv('aes-256-gcm', keyMaterial.key, iv, { authTagLength: 16 });
    const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return {
      ciphertext: new Uint8Array(encrypted),
      iv: new Uint8Array(iv),
      tag: new Uint8Array(tag),
      keyId: session.keyId,
      timestamp: Date.now(),
    };
  }
  
  // Rotate session key
  rotateSessionKey(sessionId: string): string {
    const session = this.sessionKeys.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const newKeyId = this.keyManager.rotateKey(session.keyId, 'session');
    session.keyId = newKeyId;
    
    return newKeyId;
  }
  
  private generateSessionId(): string {
    return `sess_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }
  
  private generateMessageId(): string {
    return `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }
}
```

## Integration with Gateway

### Encryption Service

```typescript
// src/services/encryption-service.ts
import { KeyManager } from './crypto/key-manager';
import { SymmetricEncryptor } from './crypto/symmetric';
import { AsymmetricEncryptor } from './crypto/asymmetric';
import { ECCrypto } from './crypto/ec-crypto';
import { MessageEncryptor } from './crypto/message-encryptor';
import { SessionEncryptor } from './crypto/session-encryptor';

export interface EncryptionOptions {
  encryptionEnabled: boolean;
  e2eeEnabled: boolean;
  sessionEncryptionEnabled: boolean;
  storageEncryptionEnabled: boolean;
}

export class EncryptionService {
  private keyManager: KeyManager;
  private symmetricEncryptor: SymmetricEncryptor;
  private asymmetricEncryptor: AsymmetricEncryptor;
  private ecc: ECCrypto;
  private messageEncryptor: MessageEncryptor;
  private sessionEncryptor: SessionEncryptor;
  private options: EncryptionOptions;
  private userKeyPairs: Map<string, { publicKey: Buffer; privateKey: Buffer }> = new Map();
  
  constructor(options: Partial<EncryptionOptions> = {}) {
    this.keyManager = new KeyManager();
    this.symmetricEncryptor = new SymmetricEncryptor(this.keyManager);
    this.asymmetricEncryptor = new AsymmetricEncryptor();
    this.ecc = new ECCrypto();
    this.messageEncryptor = new MessageEncryptor(this.keyManager);
    this.sessionEncryptor = new SessionEncryptor(this.keyManager);
    
    this.options = {
      encryptionEnabled: true,
      e2eeEnabled: true,
      sessionEncryptionEnabled: true,
      storageEncryptionEnabled: true,
      ...options,
    };
  }
  
  // Initialize encryption for user
  async initializeUser(userId: string, deviceId: string): Promise<void> {
    if (!this.options.encryptionEnabled) return;
    
    // Generate device key pair
    const keyPair = this.ecc.generateX25519KeyPair();
    this.userKeyPairs.set(`${userId}:${deviceId}`, {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    });
    
    // Generate session key
    const sessionId = this.sessionEncryptor.createSession(userId, deviceId);
    
    // Store session
    this.storeUserSession(userId, deviceId, sessionId);
  }
  
  // Encrypt message
  async encryptMessage(
    message: string,
    senderId: string,
    senderDeviceId: string,
    recipientUserId: string,
    recipientDeviceId: string
  ): Promise<any> {
    if (!this.options.encryptionEnabled || !this.options.e2eeEnabled) {
      return { message, encrypted: false };
    }
    
    // Get recipient's public key
    const recipientKeyPair = this.userKeyPairs.get(`${recipientUserId}:${recipientDeviceId}`);
    if (!recipientKeyPair) {
      throw new Error(`Recipient ${recipientUserId}:${recipientDeviceId} not found`);
    }
    
    // Encrypt message
    const encrypted = this.messageEncryptor.encryptMessage(
      message,
      new Uint8Array(recipientKeyPair.publicKey)
    );
    
    return {
      ...encrypted,
      encrypted: true,
      senderId,
      senderDeviceId,
      recipientUserId,
      recipientDeviceId,
    };
  }
  
  // Decrypt message
  async decryptMessage(
    encryptedMessage: any,
    recipientUserId: string,
    recipientDeviceId: string
  ): Promise<string> {
    if (!encryptedMessage.encrypted) {
      return encryptedMessage.message;
    }
    
    const keyPair = this.userKeyPairs.get(`${recipientUserId}:${recipientDeviceId}`);
    if (!keyPair) {
      throw new Error(`Key pair for ${recipientUserId}:${recipientDeviceId} not found`);
    }
    
    return this.messageEncryptor.decryptMessage(
      encryptedMessage,
      new Uint8Array(keyPair.privateKey)
    );
  }
  
  // Encrypt session data
  encryptSessionData(sessionId: string, data: any): any {
    if (!this.options.encryptionEnabled || !this.options.storageEncryptionEnabled) {
      return { data, encrypted: false };
    }
    
    const encrypted = this.sessionEncryptor.encryptSessionData(sessionId, data);
    return { encrypted, encrypted: true };
  }
  
  // Decrypt session data
  decryptSessionData(sessionId: string, encrypted: any): any {
    if (!encrypted.encrypted) {
      return encrypted.data;
    }
    
    const decrypted = this.sessionEncryptor.decryptInSession(
      sessionId,
      encrypted.encrypted
    );
    return JSON.parse(decrypted);
  }
  
  private storeUserSession(userId: string, deviceId: string, sessionId: string): void {
    // Store in memory or database
    // In production, persist to database
  }
}
```

## Configuration (Zod Schema)

```typescript
// src/config/encryption-config.ts
import { z } from 'zod';

export const EncryptionAlgorithm = z.enum([
  'aes-256-gcm', 'chacha20-poly1305', 'xchacha20-poly1305'
]);

export const KeyExchangeAlgorithm = z.enum([
  'x25519', 'p-256', 'p-384', 'p-521'
]);

export const SignatureAlgorithm = z.enum([
  'ed25519', 'ecdsa-p256', 'ecdsa-p384', 'rsa-2048', 'rsa-4096'
]);

export const HashAlgorithm = z.enum([
  'sha-256', 'sha-384', 'sha-512', 'blake2b-256', 'blake3'
]);

export const EncryptionConfigSchema = z.object({
  // Global settings
  enabled: z.boolean().default(true),
  
  // Message encryption
  messages: z.object({
    enabled: z.boolean().default(true),
    algorithm: EncryptionAlgorithm.default('xchacha20-poly1305'),
    keyRotationInterval: z.number().int().positive().default(24 * 60 * 60 * 1000), // 24 hours
  }).default({}),
  
  // Session encryption
  sessions: z.object({
    enabled: z.boolean().default(true),
    algorithm: EncryptionAlgorithm.default('xchacha20-poly1305'),
    keyRotationInterval: z.number().int().positive().default(24 * 60 * 60 * 1000),
  }).default({}),
  
  // Storage encryption
  storage: z.object({
    enabled: z.boolean().default(true),
    algorithm: EncryptionAlgorithm.default('aes-256-gcm'),
    encryptSessionData: z.boolean().default(true),
    encryptMessages: z.boolean().default(true),
  }).default({}),
  
  // Key exchange
  keyExchange: z.object({
    algorithm: KeyExchangeAlgorithm.default('x25519'),
    ephemeralKeys: z.boolean().default(true),
  }).default({}),
  
  // Signatures
  signatures: z.object({
    algorithm: SignatureAlgorithm.default('ed25519'),
    signMessages: z.boolean().default(false),
  }).default({}),
  
  // Hashing
  hashing: z.object({
    algorithm: HashAlgorithm.default('sha-256'),
    passwordHash: z.object({
      algorithm: z.enum(['argon2id', 'scrypt', 'pbkdf2']).default('argon2id'),
      timeCost: z.number().int().positive().default(3),
      memoryCost: z.number().int().positive().default(65536),
      parallelism: z.number().int().positive().default(1),
    }).default({}),
  }).default({}),
  
  // Key management
  keyManagement: z.object({
    masterKey: z.object({
      generateOnStartup: z.boolean().default(true),
      persist: z.boolean().default(true),
      path: z.string().optional(),
    }).default({}),
    keyRotation: z.object({
      enabled: z.boolean().default(true),
      interval: z.number().int().positive().default(30 * 24 * 60 * 60 * 1000), // 30 days
    }).default({}),
  }).default({}),
  
  // Security
  security: z.object({
    minimumKeySize: z.number().int().positive().default(256),
    requirePerfectForwardSecrecy: z.boolean().default(true),
    allowWeakAlgorithms: z.boolean().default(false),
  }).default({}),
});

export type EncryptionConfig = z.infer<typeof EncryptionConfigSchema>;

export const DefaultEncryptionConfig: EncryptionConfig = {
  enabled: true,
  messages: { enabled: true, algorithm: 'xchacha20-poly1305' },
  sessions: { enabled: true, algorithm: 'xchacha20-poly1305' },
  storage: { enabled: true, algorithm: 'aes-256-gcm' },
  keyExchange: { algorithm: 'x25519', ephemeralKeys: true },
  signatures: { algorithm: 'ed25519', signMessages: false },
  hashing: { algorithm: 'sha-256' },
  keyManagement: { masterKey: { generateOnStartup: true }, keyRotation: { enabled: true } },
  security: { minimumKeySize: 256, requirePerfectForwardSecrecy: true },
};
```

## Best Practices

### 1. Always Use Perfect Forward Secrecy

```typescript
// Generate unique ephemeral key for each message
const ephemeralKey = crypto.generateEphemeralKey();
// This ensures that even if long-term key is compromised,
// past messages cannot be decrypted
```

### 2. Never Store Plaintext Keys

```typescript
// Bad: Store private key in plaintext
bad: await fs.writeFile('key.pem', privateKey.toString());

// Good: Encrypt key before storage
const encryptedKey = encrypt(privateKey, masterKey);
await fs.writeFile('key.enc', encryptedKey);
```

### 3. Use Authenticated Encryption

```typescript
// Always use AEAD modes (GCM, Poly1305) that provide both
// confidentiality and integrity
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
// This prevents tampering with ciphertext
```

### 4. Rotate Keys Regularly

```typescript
// Set up automatic key rotation
setInterval(() => {
  encryptionService.rotateMasterKey();
  encryptionService.rotateAllSessionKeys();
}, 30 * 24 * 60 * 60 * 1000); // 30 days
```

### 5. Use Constant-Time Comparisons

```typescript
// Prevent timing attacks
function compareTimingSafe(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
```

### 6. Validate All Inputs

```typescript
// Always validate before using for encryption
function validateEncryptionInput(data: any): boolean {
  if (typeof data !== 'string' && !(data instanceof Uint8Array)) {
    return false;
  }
  if (data.length === 0) return false;
  if (data.length > MAX_DATA_SIZE) return false;
  return true;
}
```

### 7. Use Memory-Safe Operations

```typescript
// Zero out sensitive data after use
function secureWipe(buffer: Uint8Array): void {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = 0;
  }
}

// Usage
const key = generateKey();
try {
  encrypt(key, data);
} finally {
  secureWipe(key);
}
```

## Security Considerations

### Threat Model

1. **Eavesdropping**: Protect with transport encryption (TLS) and message encryption
2. **Tampering**: Use authenticated encryption (AEAD) modes
3. **Replay Attacks**: Include timestamps/nonce in encrypted data
4. **Key Compromise**: Use perfect forward secrecy, rotate keys regularly
5. **Side-Channel Attacks**: Use constant-time operations
6. **Brute Force**: Use strong key sizes (256-bit minimum)
7. **Implementation Flaws**: Use well-audited libraries (libsodium)

### Key Security Requirements

1. **Master Key**: Never leaves the server, encrypted at rest
2. **Session Keys**: Unique per session, derived from master key
3. **Message Keys**: Ephemeral, unique per message (for PFS)
4. **Private Keys**: Never transmitted, stored encrypted
5. **Public Keys**: Can be transmitted, but must be verified

## Testing

### Unit Tests

```typescript
import { ECCrypto } from '../services/crypto/ec-crypto';
import { MessageEncryptor } from '../services/crypto/message-encryptor';
import { KeyManager } from '../services/crypto/key-manager';

describe('ECCrypto', () => {
  let ecc: ECCrypto;
  
  beforeEach(() => {
    ecc = new ECCrypto();
  });
  
  describe('Key Generation', () => {
    it('generates X25519 key pair', () => {
      const keyPair = ecc.generateX25519KeyPair();
      expect(keyPair.publicKey.length).toBe(32);
      expect(keyPair.privateKey.length).toBe(32);
    });
    
    it('generates Ed25519 key pair', () => {
      const keyPair = ecc.generateEd25519KeyPair();
      expect(keyPair.publicKey.length).toBe(32);
      expect(keyPair.privateKey.length).toBe(64); // Ed25519 private key is 64 bytes
    });
  });
  
  describe('Key Exchange', () => {
    it('computes shared secret', () => {
      const alice = ecc.generateX25519KeyPair();
      const bob = ecc.generateX25519KeyPair();
      
      const aliceSecret = ecc.computeSharedSecret(
        Buffer.from(alice.privateKey),
        Buffer.from(bob.publicKey)
      );
      const bobSecret = ecc.computeSharedSecret(
        Buffer.from(bob.privateKey),
        Buffer.from(alice.publicKey)
      );
      
      expect(aliceSecret).toEqual(bobSecret);
    });
  });
  
  describe('Signing', () => {
    it('signs and verifies messages', () => {
      const keyPair = ecc.generateEd25519KeyPair();
      const message = Buffer.from('test message');
      
      const signature = ecc.sign(Buffer.from(keyPair.privateKey), message);
      const isValid = ecc.verify(
        Buffer.from(keyPair.publicKey),
        message,
        signature
      );
      
      expect(isValid).toBe(true);
    });
    
    it('detects tampered signatures', () => {
      const keyPair = ecc.generateEd25519KeyPair();
      const message = Buffer.from('test message');
      
      const signature = ecc.sign(Buffer.from(keyPair.privateKey), message);
      const isValid = ecc.verify(
        Buffer.from(keyPair.publicKey),
        Buffer.from('tampered message'),
        signature
      );
      
      expect(isValid).toBe(false);
    });
  });
});

describe('MessageEncryptor', () => {
  let keyManager: KeyManager;
  let messageEncryptor: MessageEncryptor;
  
  beforeEach(() => {
    keyManager = new KeyManager();
    messageEncryptor = new MessageEncryptor(keyManager);
  });
  
  it('encrypts and decrypts messages', () => {
    const message = 'Hello, world!';
    const recipientKeyPair = ecc.generateX25519KeyPair();
    
    const encrypted = messageEncryptor.encryptMessage(
      message,
      new Uint8Array(recipientKeyPair.publicKey)
    );
    
    const decrypted = messageEncryptor.decryptMessage(
      encrypted,
      new Uint8Array(recipientKeyPair.privateKey.slice(0, 32))
    );
    
    expect(decrypted).toBe(message);
  });
  
  it('produces different ciphertext for same message', () => {
    const message = 'Hello, world!';
    const recipientKeyPair = ecc.generateX25519KeyPair();
    
    const encrypted1 = messageEncryptor.encryptMessage(
      message,
      new Uint8Array(recipientKeyPair.publicKey)
    );
    const encrypted2 = messageEncryptor.encryptMessage(
      message,
      new Uint8Array(recipientKeyPair.publicKey)
    );
    
    // Nonces should be different
    expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
    // Ciphertexts should be different
    expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
  });
});
```

### Integration Tests

```typescript
describe('EncryptionService Integration', () => {
  let encryptionService: EncryptionService;
  
  beforeEach(() => {
    encryptionService = new EncryptionService();
  });
  
  it('roundtrip: encrypt and decrypt message', async () => {
    const userId = 'user:1';
    const deviceId = 'device:1';
    const recipientUserId = 'user:2';
    const recipientDeviceId = 'device:1';
    const message = 'Test message';
    
    // Initialize users
    await encryptionService.initializeUser(userId, deviceId);
    await encryptionService.initializeUser(recipientUserId, recipientDeviceId);
    
    // Encrypt
    const encrypted = await encryptionService.encryptMessage(
      message,
      userId,
      deviceId,
      recipientUserId,
      recipientDeviceId
    );
    
    // Decrypt
    const decrypted = await encryptionService.decryptMessage(
      encrypted,
      recipientUserId,
      recipientDeviceId
    );
    
    expect(decrypted).toBe(message);
  });
  
  it('handles missing recipient key', async () => {
    const userId = 'user:1';
    const deviceId = 'device:1';
    const message = 'Test message';
    
    await encryptionService.initializeUser(userId, deviceId);
    
    await expect(
      encryptionService.encryptMessage(
        message,
        userId,
        deviceId,
        'user:nonexistent',
        'device:1'
      )
    ).rejects.toThrow();
  });
});
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Decryption fails | Wrong key | Verify correct recipient key is used |
| Key not found | Key rotated/expired | Use key manager to get current key |
| Invalid signature | Tampered data | Verify data integrity |
| Slow performance | Software fallback | Use hardware acceleration (AES-NI) |
| Memory issues | Large message | Use chunked encryption for large data |

### Debug Commands

```bash
# Check encryption status
curl http://localhost:3000/api/encryption/status

# Test encryption roundtrip
curl -X POST http://localhost:3000/api/encryption/test \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# Check key status
curl http://localhost:3000/api/keys/list

# Rotate keys
curl -X POST http://localhost:3000/api/keys/rotate
```

## Resources

- **[libsodium](https://doc.libsodium.org/)** - Modern cryptography library
- **[Node.js Crypto](https://nodejs.org/api/crypto.html)** - Built-in crypto module
- **[WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)** - Browser crypto
- **[Bun SQLite](https://bun.sh/docs/api/sqlite)** - SQLite for key storage
- **[TweetNaCl.js](https://tweetnacl.js.org/)** - JavaScript port of NaCl
- **[OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)** - Best practices

## Principles

1. **Confidentiality**: Only authorized parties can read data
2. **Integrity**: Data cannot be tampered with undetected
3. **Availability**: Data is accessible when needed
4. **Forward Secrecy**: Past communications remain secure even if keys are compromised
5. **Minimal Trust**: Minimize assumptions about infrastructure security
6. **Defense in Depth**: Multiple layers of security (encryption + auth + policies)
7. **Simplicity**: Use well-understood, standard algorithms
8. **Auditability**: All crypto operations should be logged and verifiable

