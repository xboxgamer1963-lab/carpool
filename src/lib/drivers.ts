import { getDb } from "./firebase";

export interface Driver {
  id: string;
  ownerId: string; // Clerk user id
  name: string;
  phone: string; // E.164-ish, used for tel: and WhatsApp links
  carMake: string;
  carModel: string;
  carColor: string;
  seats: number;
  fromLocation: string; // home / start area
  toLocation: string; // drop-off / destination area
  // Coordinates set via the map picker. null when a listing predates the map.
  fromLat: number | null;
  fromLng: number | null;
  toLat: number | null;
  toLng: number | null;
  stops: string[]; // optional intermediate areas
  departTime: string; // "08:00"
  returnTime: string; // "17:30"
  days: string[]; // ["Mon","Tue",...]
  fare: string; // free text, e.g. "Rs 5000/month" or "Negotiable"
  notes: string;
  createdAt: number;
}

export type DriverInput = Omit<Driver, "id" | "createdAt">;

const COLLECTION = "drivers";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export async function createDriver(data: DriverInput): Promise<string> {
  const db = getDb();
  const ref = await db.collection(COLLECTION).add({
    ...data,
    // Lowercased fields kept for cheap case-insensitive matching.
    fromLocation_lc: normalize(data.fromLocation),
    toLocation_lc: normalize(data.toLocation),
    createdAt: Date.now(),
  });
  return ref.id;
}

function docToDriver(
  doc:
    | FirebaseFirestore.QueryDocumentSnapshot
    | FirebaseFirestore.DocumentSnapshot
): Driver {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    ownerId: d.ownerId ?? "",
    name: d.name ?? "",
    phone: d.phone ?? "",
    carMake: d.carMake ?? "",
    carModel: d.carModel ?? "",
    carColor: d.carColor ?? "",
    seats: d.seats ?? 0,
    fromLocation: d.fromLocation ?? "",
    toLocation: d.toLocation ?? "",
    fromLat: typeof d.fromLat === "number" ? d.fromLat : null,
    fromLng: typeof d.fromLng === "number" ? d.fromLng : null,
    toLat: typeof d.toLat === "number" ? d.toLat : null,
    toLng: typeof d.toLng === "number" ? d.toLng : null,
    stops: d.stops ?? [],
    departTime: d.departTime ?? "",
    returnTime: d.returnTime ?? "",
    days: d.days ?? [],
    fare: d.fare ?? "",
    notes: d.notes ?? "",
    createdAt: d.createdAt ?? 0,
  };
}

export async function listDrivers(): Promise<Driver[]> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(docToDriver);
}

export async function getDriversByOwner(ownerId: string): Promise<Driver[]> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTION)
    .where("ownerId", "==", ownerId)
    .get();
  return snap.docs
    .map(docToDriver)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Substring search over from/to/stops. Firestore can't do substring queries,
 * so for this scale we read the collection and filter in memory. Either field
 * is optional; matching is an AND across whichever was provided.
 */
export async function searchDrivers(
  from?: string,
  to?: string
): Promise<Driver[]> {
  const all = await listDrivers();
  const f = from ? normalize(from) : "";
  const t = to ? normalize(to) : "";
  if (!f && !t) return all;

  return all.filter((d) => {
    const fromHay = [d.fromLocation, ...d.stops].map(normalize).join(" | ");
    const toHay = [d.toLocation, ...d.stops].map(normalize).join(" | ");
    const fromOk = !f || fromHay.includes(f);
    const toOk = !t || toHay.includes(t);
    return fromOk && toOk;
  });
}

export async function getDriver(id: string): Promise<Driver | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return docToDriver(doc);
}

/** Updates a listing only if it belongs to `ownerId`. Returns false otherwise. */
export async function updateDriver(
  id: string,
  ownerId: string,
  data: DriverInput
): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.ownerId !== ownerId) return false;
  // ownerId and createdAt are preserved (not overwritten from the form).
  await ref.update({
    ...data,
    ownerId,
    fromLocation_lc: normalize(data.fromLocation),
    toLocation_lc: normalize(data.toLocation),
  });
  return true;
}

export async function deleteDriver(
  id: string,
  ownerId: string
): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.ownerId !== ownerId) return false;
  await ref.delete();
  return true;
}
