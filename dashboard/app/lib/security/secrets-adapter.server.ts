import { encryptSecret as builtinEncrypt, decryptSecret as builtinDecrypt } from "./secrets.server";

export type SecretsAdapter = {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string | null): string | null;
};

class BuiltinSecretsAdapter implements SecretsAdapter {
  encrypt(plaintext: string): string {
    return builtinEncrypt(plaintext);
  }
  decrypt(ciphertext: string | null): string | null {
    return builtinDecrypt(ciphertext);
  }
}

// Placeholder for future KMS-backed adapter
class KmsSecretsAdapter implements SecretsAdapter {
  encrypt(plaintext: string): string {
    // TODO: integrate with real KMS provider
    return builtinEncrypt(plaintext);
  }
  decrypt(ciphertext: string | null): string | null {
    return builtinDecrypt(ciphertext);
  }
}

export const getSecretsAdapter = (): SecretsAdapter => {
  const provider = (process.env.SECRETS_ADAPTER ?? "builtin").toLowerCase();
  switch (provider) {
    case "kms":
      return new KmsSecretsAdapter();
    case "builtin":
    default:
      return new BuiltinSecretsAdapter();
  }
};