/**
 * Selective disclosure types for confidential balances.
 */

/** Parameters for generating a disclosure proof. */
export interface DisclosureProofParams {
  /** 32-byte hex ElGamal private key */
  privkey: string
  /** 32-byte hex ElGamal public key */
  pubkey: string
  /** 32-byte hex commitment */
  commitment: string
  /** 32-byte hex handle */
  handle: string
  /** Plaintext amount in base units (tomi) */
  amount: bigint
  /** Block number for freshness binding */
  blockNumber: bigint
}

/** Result of generating a disclosure proof. */
export interface DisclosureProofResult {
  /** 96-byte hex DLEQ proof */
  proof: string
  /** Block number used in the proof */
  blockNumber: bigint
}

/** Parameters for verifying a disclosure proof. */
export interface VerifyDisclosureParams {
  /** 32-byte hex ElGamal public key */
  pubkey: string
  /** 32-byte hex commitment */
  commitment: string
  /** 32-byte hex handle */
  handle: string
  /** Claimed plaintext amount */
  amount: bigint
  /** 96-byte hex DLEQ proof */
  proof: string
  /** Block number used in the proof */
  blockNumber: bigint
}

/** A decryption token with DLEQ honesty proof. */
export interface DecryptionToken {
  /** 32-byte hex ElGamal public key of the account holder */
  pubkey: string
  /** 32-byte hex commitment */
  commitment: string
  /** 32-byte hex handle */
  handle: string
  /** 32-byte hex decryption token (sk*D) */
  token: string
  /** 96-byte hex DLEQ proof of honest generation */
  dleqProof: string
  /** Block number for chain binding */
  blockNumber: bigint
}

/** Parameters for generating a decryption token. */
export interface DecryptionTokenParams {
  /** 32-byte hex ElGamal private key */
  privkey: string
  /** 32-byte hex ElGamal public key */
  pubkey: string
  /** 32-byte hex commitment */
  commitment: string
  /** 32-byte hex handle */
  handle: string
  /** Block number for chain binding */
  blockNumber: bigint
}

/** Result of decrypting with a token. */
export interface TokenDecryptResult {
  /** Recovered plaintext amount in base units (tomi) */
  amount: bigint
}

/** Parameters for auditor-side decryption of a privacy transaction. */
export interface AuditorDecryptParams {
  /** 32-byte hex auditor ElGamal private key */
  auditorPrivkey: string
  /** Transaction hash */
  txHash: string
}

/** Result of auditor decryption. */
export interface AuditorDecryptResult {
  /** Recovered plaintext amount */
  amount: bigint
  /** Transaction type: "privTransfer" | "shield" | "unshield" */
  txType: string
}
