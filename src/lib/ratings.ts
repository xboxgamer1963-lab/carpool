import { getDb } from "./firebase";
import type { FirebaseFirestore } from "firebase-admin/firestore";

export interface Rating {
  driverId: string;
  raterId: string;
  stars: number; // 1–5
  createdAt: number;
}

const RATINGS = "ratings";
const DRIVERS = "drivers";

/** Returns the rating this user has already left for a driver, or null. */
export async function getExistingRating(
  driverId: string,
  raterId: string,
): Promise<Rating | null> {
  const db = getDb();
  const doc = await db.collection(RATINGS).doc(`${driverId}_${raterId}`).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return {
    driverId: d.driverId,
    raterId: d.raterId,
    stars: d.stars,
    createdAt: d.createdAt,
  };
}

/**
 * Submit (or update) a star rating for a driver.
 * Uses a transaction so the denormalized avg/count on the driver doc stays
 * consistent even under concurrent writes.
 */
export async function submitRating(
  driverId: string,
  raterId: string,
  stars: number,
): Promise<void> {
  if (stars < 1 || stars > 5 || !Number.isInteger(stars)) {
    throw new Error("Stars must be an integer between 1 and 5.");
  }

  const db = getDb();
  const ratingRef = db.collection(RATINGS).doc(`${driverId}_${raterId}`);
  const driverRef = db.collection(DRIVERS).doc(driverId);

  await db.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const [ratingSnap, driverSnap] = await Promise.all([
      tx.get(ratingRef),
      tx.get(driverRef),
    ]);

    if (!driverSnap.exists) throw new Error("Driver not found.");

    const driverData = driverSnap.data()!;
    const prevCount: number = driverData.ratingCount ?? 0;
    const prevSum: number = driverData.ratingSum ?? 0;

    let newSum: number;
    let newCount: number;

    if (ratingSnap.exists) {
      // Update: subtract old stars, add new
      const oldStars: number = ratingSnap.data()!.stars;
      newSum = prevSum - oldStars + stars;
      newCount = prevCount; // count unchanged
    } else {
      newSum = prevSum + stars;
      newCount = prevCount + 1;
    }

    const newAvg = Math.round((newSum / newCount) * 10) / 10;

    tx.set(ratingRef, {
      driverId,
      raterId,
      stars,
      createdAt: Date.now(),
    });

    tx.update(driverRef, {
      ratingSum: newSum,
      ratingCount: newCount,
      ratingAvg: newAvg,
    });
  });
}
