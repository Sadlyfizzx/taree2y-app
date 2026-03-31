import { generateTrips, getLocalDateInputValue } from "./travel";

function readQaParams() {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
}

export function isQaModeEnabled() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const params = readQaParams();
  return params?.get("qa") === "1";
}

export function readQaIdentity() {
  if (!isQaModeEnabled()) return null;
  const params = readQaParams();
  const userId = String(params?.get("qa_user") || "qa-user-1").trim();
  const email = String(params?.get("qa_email") || "qa@taree2y.local").trim();
  const displayName = String(params?.get("qa_name") || "حساب الاختبار").trim();
  const phone = String(params?.get("qa_phone") || "01000000000").trim();
  return {
    session: {
      access_token: "qa-access-token",
      refresh_token: "qa-refresh-token",
      token_type: "bearer",
      user: {
        id: userId,
        email,
        phone,
      },
    },
    profile: {
      id: userId,
      user_id: userId,
      email,
      phone,
      display_name: displayName,
      onboarding_completed_at: new Date().toISOString(),
      account_status: "active",
    },
  };
}

export function buildQaSearchResults(params = {}) {
  const from = String(params.from || "القاهرة").trim();
  const to = String(params.to || "الإسكندرية").trim();
  const date = String(params.date || getLocalDateInputValue()).trim();
  const passengers = Math.max(1, Number(params.passengers || 1));
  const generated = generateTrips(from, to, date);
  return {
    ...generated,
    trips: (generated.trips || []).map((trip, index) => ({
      ...trip,
      instanceId: trip.instanceId || `qa-trip-${index + 1}-${trip.id}`,
      availableSeatsCount: Array.isArray(trip.seats)
        ? trip.seats.filter((seat) => seat?.status === "available").length
        : 0,
      searchSource: "qa",
      passengers,
    })),
  };
}

export function readQaAppState() {
  if (!isQaModeEnabled()) return null;
  return {
    wallet: 1600,
    transactions: [],
    myTrips: [],
    points: 180,
    subscription: "student",
  };
}

