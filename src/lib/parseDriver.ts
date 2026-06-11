import type { DriverInput, GenderPref } from "./drivers";

function field(form: FormData, key: string): string {
  return (form.get(key)?.toString() ?? "").trim();
}

export interface ParseResult {
  data?: DriverInput;
  error?: string;
}

export function parseDriverForm(form: FormData, ownerId: string): ParseResult {
  const name = field(form, "name");
  const phone = field(form, "phone");
  const fromLocation = field(form, "fromLocation");
  const toLocation = field(form, "toLocation");

  if (!name || !phone || !fromLocation || !toLocation) {
    return { error: "Name, phone, start and destination are required." };
  }

  const coord = (key: string): number | null => {
    const n = Number.parseFloat(field(form, key));
    return Number.isFinite(n) ? n : null;
  };

  const seats = Number.parseInt(field(form, "seats"), 10);

  const rawPref = field(form, "genderPref");
  const genderPref: GenderPref =
    rawPref === "female_only" || rawPref === "male_only" ? rawPref : "any";

  const data: DriverInput = {
    ownerId,
    name,
    phone,
    carMake: field(form, "carMake"),
    carModel: field(form, "carModel"),
    carColor: field(form, "carColor"),
    seats: Number.isFinite(seats) && seats > 0 ? seats : 1,
    city: field(form, "city"),
    fromLocation,
    toLocation,
    fromLat: coord("fromLat"),
    fromLng: coord("fromLng"),
    toLat: coord("toLat"),
    toLng: coord("toLng"),
    stops: field(form, "stops")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    departTime: field(form, "departTime"),
    returnTime: field(form, "returnTime"),
    days: form.getAll("days").map((d) => d.toString()),
    fare: field(form, "fare"),
    notes: field(form, "notes"),
    genderPref,
  };

  return { data };
}
