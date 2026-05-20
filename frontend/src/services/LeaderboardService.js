import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { firebaseConfig } from '../config/firebaseConfig.js';

const COLLECTION_NAME = 'leaderboard-ranked-wins';

function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function getLeaderboardCollection() {
  return collection(getFirestore(getFirebaseApp()), COLLECTION_NAME);
}

function toLeaderboardEntry(snapshot) {
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    id: snapshot.id,
    userName: String(data.userName ?? snapshot.id),
    winCount: Number(data.winCount ?? 0),
  };
}

export class LeaderboardService {
  static async create(entry) {
    const userName = String(entry.userName ?? '').trim();
    const winCount = Number(entry.winCount ?? 0);

    if (!userName) {
      throw new Error('User name is required.');
    }

    const docRef = doc(getLeaderboardCollection(), userName);
    await setDoc(docRef, { userName, winCount });

    return {
      id: docRef.id,
      userName,
      winCount,
    };
  }

  static async getById(id) {
    const snapshot = await getDoc(doc(getLeaderboardCollection(), id));
    return toLeaderboardEntry(snapshot);
  }

  static async getAll() {
    const snapshot = await getDocs(getLeaderboardCollection());
    return snapshot.docs.map(toLeaderboardEntry).filter(Boolean);
  }

  static async update(id, payload) {
    const updatePayload = {};

    if (payload.userName !== undefined) {
      updatePayload.userName = String(payload.userName).trim();
    }

    if (payload.winCount !== undefined) {
      updatePayload.winCount = Number(payload.winCount);
    }

    await setDoc(doc(getLeaderboardCollection(), id), updatePayload, { merge: true });

    const updated = await LeaderboardService.getById(id);
    if (!updated) {
      throw new Error(`Leaderboard entry not found: ${id}`);
    }

    return updated;
  }

  static async delete(id) {
    await deleteDoc(doc(getLeaderboardCollection(), id));
  }

  static async incrementWinCount(userName, userUUID = '') {
    const normalizedUserName = String(userName ?? '').trim();
    const normalizedUserUUID = String(userUUID ?? '').trim();

    if (!normalizedUserName) {
      throw new Error('User name is required.');
    }

    const docRef = doc(getLeaderboardCollection(), normalizedUserName);

    return runTransaction(getFirestore(getFirebaseApp()), async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const currentWinCount = snapshot.exists()
        ? Number(snapshot.data().winCount ?? 0)
        : 0;
      const nextWinCount = currentWinCount + 1;

      const payload = {
        userName: normalizedUserName,
        winCount: nextWinCount,
      };

      if (normalizedUserUUID) {
        payload.userUUID = normalizedUserUUID;
      }

      transaction.set(docRef, payload, { merge: true });

      return {
        id: docRef.id,
        userName: normalizedUserName,
        userUUID: normalizedUserUUID,
        winCount: nextWinCount,
      };
    });
  }
}
