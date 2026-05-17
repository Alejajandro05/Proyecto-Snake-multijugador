import admin from "firebase-admin";import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

const COLLECTION_NAME = "leaderboard-wins";

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
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64) {
    const serviceAccountJson = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64,
      "base64",
    ).toString("utf8");

    return {
      credential: admin.credential.cert(
        JSON.parse(serviceAccountJson),
      ),
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      credential: admin.credential.applicationDefault(),
    };
  }

  throw new Error(
    "Firebase service account credentials are required. Set FIREBASE_SERVICE_ACCOUNT_JSON_B64 or GOOGLE_APPLICATION_CREDENTIALS.",
  );
};

if (!admin.apps.length) {
  admin.initializeApp(firebaseConfig());
}

const db = admin.firestore();
const collection = db.collection(COLLECTION_NAME);

export class LeaderboardService {
  static async create(entry: LeaderboardCreateData): Promise<LeaderboardEntry> {
    const docRef = await collection.add({
      userUUID: entry.userUUID,
      winCount: entry.winCount,
    });

    return {
      id: docRef.id,
      ...entry,
    };
  }

  static async getById(id: string): Promise<LeaderboardEntry | null> {
    const snapshot = await collection.doc(id).get();

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
    const snapshot = await collection.get();

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
    await collection.doc(id).set(payload, { merge: true });

    const updated = await LeaderboardService.getById(id);
    if (!updated) {
      throw new Error(`Leaderboard entry not found: ${id}`);
    }

    return updated;
  }

  static async delete(id: string): Promise<void> {
    await collection.doc(id).delete();
  }
}

// Logic for recording wins in LeaderboardService:
// When a player wins, call LeaderboardService.create({ userUUID: winnerFirebaseUid, winCount: 1 });
// This will create a new entry or update existing one if needed.
// To get existing wins: const existing = await LeaderboardService.getAll().find(e => e.userUUID === winnerFirebaseUid);
// If existing, update with winCount + 1, else create new with winCount: 1

export type { LeaderboardEntry };
export const auth = admin.auth();
