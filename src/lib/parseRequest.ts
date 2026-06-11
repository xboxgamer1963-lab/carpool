import type { RequestInput, GenderPref } from "./requests";

function field(form: FormData, key: string): string {
  return (form.get(key)?.toString() ?? "").trim();
}

export interface ParseRequestResult {
  data?: RequestInput;
  error?: string;
}

export function parseRequestForm(form: FormData, ownerId: string): ParseRequestResult {
  const name = field(form, "name");
  const phone = field(form, "phone");
  const fromLocation = field(form, "fromLocation");
  const toLocation = field(form, "toLocation");

  if (!name || !phone || !fromLocation || !toLocation) {
    return { error: "Name, phone, pickup and destination are required." };
  }

  const coord = (key: string): number | null => {
    const n = Number.parseFloat(field(form, key));
    return Number.isFinite(n) ? n : null;
  };

  const rawPref = field(form, "genderPref");
  const genderPref: GenderPref =
    rawPref === "female_only" || rawPref === "male_only" ? rawPref : "any";

  const data: RequestInput = {
    ownerId,
    name,
    phone,
    fromLocation,
    fromLat: coord("fromLat"),
    fromLng: coord("fromLng"),
    toLocation,
    toLat: coord("toLat"),
    toLng: coord("toLng"),
    departTimeFrom: field(form, "departTimeFrom"),
    departTimeTo: field(form, "departTimeTo"),
    days: form.getAll("days").map((d) => d.toString()),
    budget: field(form, "budget"),
    notes: field(form, "notes"),
    genderPref,
  };

  return { data };
}
