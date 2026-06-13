import { createCiamClient, createEngselClient } from "../clients";
import { myXlConfigFromEnv } from "../clients/config";
import { resolveFingerprint } from "../clients/fingerprint";
import type { Env } from "../env";
import type { StorageBackend } from "../storage/types";

export function createMyXlClients(env: Env, storage: StorageBackend, username: string) {
  const config = myXlConfigFromEnv(env);
  const fingerprint = () => resolveFingerprint(storage, username, config.crypto, config.axFpOverride);
  return {
    config,
    ciam: createCiamClient({ config, fingerprint }),
    engsel: createEngselClient({ config }),
  };
}