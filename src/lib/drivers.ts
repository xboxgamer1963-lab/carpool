import { getDb } from "./firebase";
import { haversineKm, detourKm, pickupOnlyDetourKm, detourThresholdKm } from "./scoring";

export type GenderPref = "any" | "female_only" | "male_only";

export interface Driver {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  carMake: string;
  carModel: string;
  carColor: string;
  seats: number;
  fromLocation: string;
  toLocation: string;
  fromLat: number | null;
  fromLng: number | null;
  toLat: number | null;
  toLng: number | null;
  stops: string[];
  departTime: string;
  returnTime: string;
  days: string[];
  fare: string;
  notes: string;
  genderPref: GenderPref;
  createdAt: number;
  expiresAt: number;
  lastRenewedAt?: number;
}

export interface ScoredDriver {
  driver: Driver;
  detourKm: number | null;
  isNearMiss?: boolean;
}

export type DriverInput = Omit<Driver, "id" | "createdAt" | "expiresAt" | "lastRenewedAt">;

export interface SearchOpts {
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  fromText?: string;
  toText?: string;
  days?: string[];
  genderPref?: string;
}

const COLLECTION = "drivers";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function resolveExpiresAt(d: Record<string, unknown>): number {
  if (typeof d.expiresAt === "number") return d.expiresAt;
  // Legacy listings: expire 30 days after creation.
  return (typeof d.createdAt === "number" ? d.createdAt : 0) + EXPIRY_MS;
}

export async function createDriver(data: DriverInput): Promise<string> {
  const db = getDb();
  const now = Date.now();
  const ref = await db.collection(COLLECTION).add({
    ...data,
    fromLocation_lc: normalize(data.fromLocation),
    toLocation_lc: normalize(data.toLocation),
    createdAt: now,
    expiresAt: now + EXPIRY_MS,
  });
  return ref.id;
}

function docToDriver(
  doc:
    | FirebaseFirestore.QueryDocumentSnapshot
    | FirebaseFirestore.DocumentSnapshot,
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
    genderPref: (d.genderPref as GenderPref) ?? "any",
    createdAt: d.createdAt ?? 0,
    expiresAt: resolveExpiresAt(d),
    lastRenewedAt: typeof d.lastRenewedAt === "number" ? d.lastRenewedAt : undefined,
  };
}

function isActive(driver: Driver): boolean {
  return driver.expiresAt > Date.now();
}

export async function listDrivers(): Promise<Driver[]> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(docToDriver).filter(isActive);
}

/** Returns ALL listings for the owner, including expired, for their dashboard. */
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

export async function searchDrivers(opts: SearchOpts): Promise<ScoredDriver[]> {
  const all = await listDrivers(); // already filtered for active

  // Day filter.
  let filtered = all;
  if (opts.days && opts.days.length > 0) {
    filtered = filtered.filter((d) =>
      opts.days!.some((day) => d.days.includes(day)),
    );
  }

  // Gender preference filter.
  if (opts.genderPref && opts.genderPref !== "any") {
    filtered = filtered.filter((d) => d.genderPref === opts.genderPref);
  }

  const hasFromCoords =
    opts.fromLat != null && opts.fromLng != null &&
    Number.isFinite(opts.fromLat) && Number.isFinite(opts.fromLng);
  const hasToCoords =
    opts.toLat != null && opts.toLng != null &&
    Number.isFinite(opts.toLat) && Number.isFinite(opts.toLng);

  // Coordinate-based detour scoring.
  if (hasFromCoords) {
    const pLat = opts.fromLat!;
    const pLng = opts.fromLng!;

    const withScores = filtered
      .filter(
        (d) =>
          d.fromLat !== null && d.fromLng !== null &&
          d.toLat !== null && d.toLng !== null,
      )
      .map((d) => {
        const routeKm = haversineKm(d.fromLat!, d.fromLng!, d.toLat!, d.toLng!);
        const threshold = detourThresholdKm(routeKm);
        const km = hasToCoords
          ? detourKm(d.fromLat!, d.fromLng!, d.toLat!, d.toLng!, pLat, pLng, opts.toLat!, opts.toLng!)
          : pickupOnlyDetourKm(d.fromLat!, d.fromLng!, d.toLat!, d.toLng!, pLat, pLng);
        return { driver: d, detourKm: km, threshold };
      });

    const matched = withScores
      .filter(({ detourKm: km, threshold }) => km <= threshold)
      .sort((a, b) => a.detourKm - b.detourKm)
      .map(({ driver, detourKm: km }) => ({ driver, detourKm: km }));

    if (matched.length > 0) return matched;

    // Near-miss: zero matches — return 3 closest regardless of threshold.
    return withScores
      .sort((a, b) => a.detourKm - b.detourKm)
      .slice(0, 3)
      .map(({ driver, detourKm: km }) => ({ driver, detourKm: km, isNearMiss: true }));
  }

  // Text fallback.
  const f = opts.fromText ? normalize(opts.fromText) : "";
  const t = opts.toText ? normalize(opts.toText) : "";

  if (!f && !t) {
    return filtered.map((d) => ({ driver: d, detourKm: null }));
  }

  return filtered
    .filter((d) => {
      const fromHay = [d.fromLocation, ...d.stops].map(normalize).join(" | ");
      const toHay = [d.toLocation, ...d.stops].map(normalize).join(" | ");
      const fromOk = !f || fromHay.includes(f);
      const toOk = !t || toHay.includes(t);
      return fromOk && toOk;
    })
    .map((d) => ({ driver: d, detourKm: null }));
}

export async function getDriver(id: string): Promise<Driver | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return docToDriver(doc);
}

export async function updateDriver(
  id: string,
  ownerId: string,
  data: DriverInput,
): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.ownerId !== ownerId) return false;
  await ref.update({
    ...data,
    ownerId,
    fromLocation_lc: normalize(data.fromLocation),
    toLocation_lc: normalize(data.toLocation),
  });
  return true;
}

export async function renewDriver(id: string, ownerId: string): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.ownerId !== ownerId) return false;
  const now = Date.now();
  await ref.update({ expiresAt: now + EXPIRY_MS, lastRenewedAt: now });
  return true;
}

export async function deleteDriver(id: string, ownerId: string): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.ownerId !== ownerId) return false;
  await ref.delete();
  return true;
}
