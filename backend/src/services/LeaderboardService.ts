import { existsSync, readFileSync, statSync } from "node:fs";
import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";
import type { Auth } from "firebase-admin/auth";
import type { CollectionReference, Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";

const COLLECTION_NAME = "leaderboard-wins";
const DEFAULT_SERVICE_ACCOUNT_PATH = "/app/secrets/firebase-service-account.json";
let db: Firestore | null = null;
let collection: CollectionReference | null = null;
let cachedAuth: Auth | null = null;

interface LeaderboardEntry {
  id?: string;
  userUUID: string;
  winCount: number;
}

interface LeaderboardCreateData {
  userUUID: string;
  winCount: number;
}

const firebaseConfig = () => {
  const parseServiceAccount = (rawJson: string): ServiceAccount => {
    try {
      return JSON.parse(rawJson) as ServiceAccount;
    } catch {
      throw new Error("Invalid Firebase service account JSON.");
    }
  };

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64) {
    const serviceAccountJson = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64,
      "base64",
    ).toString("utf8");

    return {
      credential: admin.credential.cert(parseServiceAccount(serviceAccountJson)),
    };
  }

  const configuredCredentialPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    DEFAULT_SERVICE_ACCOUNT_PATH;

  if (configuredCredentialPath && existsSync(configuredCredentialPath)) {
    if (!statSync(configuredCredentialPath).isFile()) {
      throw new Error(
        `Firebase credential path is not a file: ${configuredCredentialPath}. Check your Docker bind mount; a directory may have been mounted instead of a JSON file.`,
      );
    }

    const serviceAccountJson = readFileSync(configuredCredentialPath, "utf8");

    return {
      credential: admin.credential.cert(parseServiceAccount(serviceAccountJson)),
    };
  }

  throw new Error(
    `Firebase service account credentials are required. Checked path: ${configuredCredentialPath}. Set FIREBASE_SERVICE_ACCOUNT_JSON_B64, FIREBASE_SERVICE_ACCOUNT_PATH, or GOOGLE_APPLICATION_CREDENTIALS.`,
  );
};

function ensureFirebaseApp() {
  if (!admin.apps.length) {
    admin.initializeApp(firebaseConfig());
  }
}

function getDb() {
  ensureFirebaseApp();
  if (!db) {
    db = admin.firestore();
  }

  return db;
}

function getCollection() {
  if (!collection) {
    collection = getDb().collection(COLLECTION_NAME);
  }

  return collection;
}

export function getFirebaseAuth() {
  ensureFirebaseApp();
  if (!cachedAuth) {
    cachedAuth = admin.auth();
  }

  return cachedAuth;
}

export class LeaderboardService {
  static async create(entry: LeaderboardCreateData): Promise<LeaderboardEntry> {
    const docRef = await getCollection().add({
      userUUID: entry.userUUID,
      winCount: entry.winCount,
    });

    return {
      id: docRef.id,
      ...entry,
    };
  }

  static async getById(id: string): Promise<LeaderboardEntry | null> {
    const snapshot = await getCollection().doc(id).get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data();

    return {
      id: snapshot.id,
      userUUID: String(data?.userUUID ?? ""),
      winCount: Number(data?.winCount ?? 0),
    };
  }

  static async getAll(): Promise<LeaderboardEntry[]> {
    const snapshot = await getCollection().get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        userUUID: String(data.userUUID || ""),
        winCount: Number(data.winCount || 0),
      };
    });
  }

  static async update(
    id: string,
    payload: Partial<LeaderboardCreateData>,
  ): Promise<LeaderboardEntry> {
    await getCollection().doc(id).set(payload, { merge: true });

    const updated = await LeaderboardService.getById(id);
    if (!updated) {
      throw new Error(`Leaderboard entry not found: ${id}`);
    }

    return updated;
  }

  static async delete(id: string): Promise<void> {
    await getCollection().doc(id).delete();
  }
}

// Logic for recording wins in LeaderboardService:
// When a player wins, call LeaderboardService.create({ userUUID: winnerFirebaseUid, winCount: 1 });
// This will create a new entry or update existing one if needed.
// To get existing wins: const existing = await LeaderboardService.getAll().find(e => e.userUUID === winnerFirebaseUid);
// If existing, update with winCount + 1, else create new with winCount: 1

export type { LeaderboardEntry };
