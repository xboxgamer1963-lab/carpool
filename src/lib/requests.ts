import { getDb } from "./firebase";
import { haversineKm, detourKm, pickupOnlyDetourKm, detourThresholdKm } from "./scoring";
import type { GenderPref, SearchOpts } from "./drivers";

export interface RiderRequest {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  city: string;
  fromLocation: string;
  fromLat: number | null;
  fromLng: number | null;
  toLocation: string;
  toLat: number | null;
  toLng: number | null;
  departTimeFrom: string;
  departTimeTo: string;
  days: string[];
  budget: string;
  notes: string;
  genderPref: GenderPref;
  status: "open" | "closed";
  createdAt: number;
  expiresAt: number;
  lastRenewedAt?: number;
}

export interface ScoredRequest {
  request: RiderRequest;
  detourKm: number | null;
  isNearMiss?: boolean;
}

export type RequestInput = Omit<RiderRequest, "id" | "createdAt" | "expiresAt" | "lastRenewedAt" | "status">;

const COLLECTION = "requests";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

function resolveExpiresAt(d: Record<string, unknown>): number {
  if (typeof d.expiresAt === "number") return d.expiresAt;
  return (typeof d.createdAt === "number" ? d.createdAt : 0) + EXPIRY_MS;
}

function docToRequest(
  doc:
    | FirebaseFirestore.QueryDocumentSnapshot
    | FirebaseFirestore.DocumentSnapshot,
): RiderRequest {
  const d = doc.data() ?? {};
  return {
    id: doc.id,
    ownerId: d.ownerId ?? "",
    name: d.name ?? "",
    phone: d.phone ?? "",
    city: d.city ?? "",
    fromLocation: d.fromLocation ?? "",
    fromLat: typeof d.fromLat === "number" ? d.fromLat : null,
    fromLng: typeof d.fromLng === "number" ? d.fromLng : null,
    toLocation: d.toLocation ?? "",
    toLat: typeof d.toLat === "number" ? d.toLat : null,
    toLng: typeof d.toLng === "number" ? d.toLng : null,
    departTimeFrom: d.departTimeFrom ?? "",
    departTimeTo: d.departTimeTo ?? "",
    days: d.days ?? [],
    budget: d.budget ?? "",
    notes: d.notes ?? "",
    genderPref: (d.genderPref as GenderPref) ?? "any",
    status: d.status ?? "open",
    createdAt: d.createdAt ?? 0,
    expiresAt: resolveExpiresAt(d),
    lastRenewedAt: typeof d.lastRenewedAt === "number" ? d.lastRenewedAt : undefined,
  };
}

function isActiveRequest(r: RiderRequest): boolean {
  return r.status === "open" && r.expiresAt > Date.now();
}

export async function createRequest(data: RequestInput): Promise<string> {
  const db = getDb();
  const now = Date.now();
  const ref = await db.collection(COLLECTION).add({
    ...data,
    status: "open",
    createdAt: now,
    expiresAt: now + EXPIRY_MS,
  });
  return ref.id;
}

export async function listRequests(): Promise<RiderRequest[]> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map(docToRequest).filter(isActiveRequest);
}

export async function getRequestsByOwner(ownerId: string): Promise<RiderRequest[]> {
  const db = getDb();
  const snap = await db
    .collection(COLLECTION)
    .where("ownerId", "==", ownerId)
    .get();
  return snap.docs
    .map(docToRequest)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRequest(id: string): Promise<RiderRequest | null> {
  const doc = await getDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return docToRequest(doc);
}

/**
 * Search rider requests by a driver's route (A→B coordinates).
 * Roles are swapped: rider's P/D are fixed, driver provides A/B.
 */
export async function searchRequests(opts: SearchOpts): Promise<ScoredRequest[]> {
  const all = await listRequests();

  let filtered = all;
  if (opts.days && opts.days.length > 0) {
    filtered = filtered.filter((r) =>
      opts.days!.some((day) => r.days.includes(day)),
    );
  }
  if (opts.genderPref && opts.genderPref !== "any") {
    filtered = filtered.filter((r) => r.genderPref === opts.genderPref);
  }

  const hasFromCoords =
    opts.fromLat != null && opts.fromLng != null &&
    Number.isFinite(opts.fromLat) && Number.isFinite(opts.fromLng);
  const hasToCoords =
    opts.toLat != null && opts.toLng != null &&
    Number.isFinite(opts.toLat) && Number.isFinite(opts.toLng);

  if (hasFromCoords) {
    const aLat = opts.fromLat!; // driver's pickup
    const aLng = opts.fromLng!;
    const bLat = opts.toLat;
    const bLng = opts.toLng;

    const withScores = filtered
      .filter(
        (r) =>
          r.fromLat !== null && r.fromLng !== null &&
          r.toLat !== null && r.toLng !== null,
      )
      .map((r) => {
        let km: number;
        let threshold: number;
        if (hasToCoords) {
          const routeKm = haversineKm(aLat, aLng, bLat!, bLng!);
          threshold = detourThresholdKm(routeKm);
          // Detour from the driver's perspective to serve the rider's P→D
          km = detourKm(aLat, aLng, bLat!, bLng!, r.fromLat!, r.fromLng!, r.toLat!, r.toLng!);
        } else {
          threshold = 3;
          km = pickupOnlyDetourKm(aLat, aLng, r.fromLat!, r.fromLng!, r.toLat! ?? aLat, r.toLng! ?? aLng);
        }
        return { request: r, detourKm: km, threshold };
      });

    const matched = withScores
      .filter(({ detourKm: km, threshold }) => km <= threshold)
      .sort((a, b) => a.detourKm - b.detourKm)
      .map(({ request, detourKm: km }) => ({ request, detourKm: km }));

    if (matched.length > 0) return matched;

    return withScores
      .sort((a, b) => a.detourKm - b.detourKm)
      .slice(0, 3)
      .map(({ request, detourKm: km }) => ({ request, detourKm: km, isNearMiss: true }));
  }

  const f = opts.fromText ? opts.fromText.trim().toLowerCase() : "";
  const t = opts.toText ? opts.toText.trim().toLowerCase() : "";

  if (!f && !t) {
    return filtered.map((r) => ({ request: r, detourKm: null }));
  }

  return filtered
    .filter((r) => {
      const fromOk = !f || r.fromLocation.toLowerCase().includes(f);
      const toOk = !t || r.toLocation.toLowerCase().includes(t);
      return fromOk && toOk;
    })
    .map((r) => ({ request: r, detourKm: null }));
}

export async function closeRequest(id: string, ownerId: string): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.ownerId !== ownerId) return false;
  await ref.update({ status: "closed" });
  return true;
}

export async function renewRequest(id: string, ownerId: string): Promise<boolean> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.ownerId !== ownerId) return false;
  const now = Date.now();
  await ref.update({ status: "open", expiresAt: now + EXPIRY_MS, lastRenewedAt: now });
  return true;
}
