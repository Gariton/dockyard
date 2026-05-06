export function getAgentSharedToken() {
  const token = process.env.AGENT_SHARED_TOKEN;
  if (!token) {
    throw new Error("AGENT_SHARED_TOKEN is required for agent APIs");
  }

  return token;
}

export function getEncryptionSecret() {
  const key = process.env.DOCKYARD_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("DOCKYARD_ENCRYPTION_KEY is required");
  }

  return key;
}
