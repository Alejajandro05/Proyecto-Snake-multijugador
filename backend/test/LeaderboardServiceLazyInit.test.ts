import assert from "node:assert/strict";

describe("Firebase leaderboard initialization", () => {
  const previousFirebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const previousGoogleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const previousFirebaseServiceAccountJsonB64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;

  after(() => {
    restoreEnv("FIREBASE_SERVICE_ACCOUNT_PATH", previousFirebaseServiceAccountPath);
    restoreEnv("GOOGLE_APPLICATION_CREDENTIALS", previousGoogleApplicationCredentials);
    restoreEnv("FIREBASE_SERVICE_ACCOUNT_JSON_B64", previousFirebaseServiceAccountJsonB64);
  });

  it("allows the Colyseus app config to load without Firebase credentials", async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;

    const appConfig = await import("../src/app.config.js");

    assert.ok(appConfig.default);
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
