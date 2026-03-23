#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${1:-$(pwd)}"

if [ ! -d "$PROJECT_DIR" ]; then
  echo "Project directory not found: $PROJECT_DIR" >&2
  exit 1
fi

cd "$PROJECT_DIR"

for f in src/app/components/UserApp.jsx src/lib/tripInventory.js; do
  if [ ! -f "$f" ]; then
    echo "Missing required file: $f" >&2
    exit 1
  fi
done

backup_dir=".patch_backup_qa_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$backup_dir"
cp src/app/components/UserApp.jsx "$backup_dir/UserApp.jsx.bak"
cp src/lib/tripInventory.js "$backup_dir/tripInventory.js.bak"

python3 <<'PY'
from pathlib import Path
import sys

user_app = Path("src/app/components/UserApp.jsx")
trip_inventory = Path("src/lib/tripInventory.js")

ua = user_app.read_text(encoding="utf-8")
ti = trip_inventory.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"[patch failed] Could not find block for: {label}")
    return text.replace(old, new, 1)

ua = replace_once(
    ua,
    "import { useMemo, useState } from 'react';",
    "import { useEffect, useMemo, useRef, useState } from 'react';",
    "react import upgrade",
)

old_states = """  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [viewedTicket, setViewedTicket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
"""
new_states = """  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [viewedTicket, setViewedTicket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activeModal, setActiveModal] = useState(null);

  const qaStateRef = useRef({});
  qaStateRef.current = {
    wallet,
    transactions,
    myTrips,
    points,
    subscription,
    searchParams,
    searchResults,
    selectedTrip,
    selectedSeats,
    currentInvoice,
    viewedTicket,
    activeTab,
    activeView,
  };
"""
ua = replace_once(ua, old_states, new_states, "qaStateRef insertion")

old_before_refund = """  const processDelayedRefund = async (tripToCancel) => {
"""
new_helpers = """  const finalizeBookingSuccess = (ticket, invoice) => {
    if (String(ticket?.bookingId || ticket?.id || '').startsWith('demo-')) {
      setMyTrips((prev) => [ticket, ...prev]);
    }
    setCurrentInvoice(invoice);
    setViewedTicket(ticket);
    navigateTo('invoice');
  };

  const createBookingForTrip = async ({ trip, seatNumbers, passengers, promoCode, hasLuggage, rideToStation, needsAccess }) => {
    if (!trip?.instanceId) {
      return createDemoBookingResult({ trip, seatNumbers, passengers, promoCode, hasLuggage, rideToStation, needsAccess });
    }
    const result = await createBookingAtomic({
      tripInstanceId: trip.instanceId,
      seatNumbers,
      passengers,
      promoCode,
      hasLuggage,
      rideToStation,
      needsAccess,
    });
    if (result?.ok) await refreshCloudState({ silent: true, force: true });
    return result;
  };

  const commitSeatSelection = async (tripArg = selectedTrip, seatNumbersArg = selectedSeats) => {
    if (!tripArg) {
      return { ok: false, message: 'No trip selected' };
    }

    if (!tripArg?.instanceId) {
      navigateTo('checkout');
      return { ok: true, source: 'demo' };
    }

    const holdResult = await holdTripSeats({
      tripInstanceId: tripArg.instanceId,
      seatNumbers: seatNumbersArg,
    });

    if (!holdResult?.ok) {
      showToast(holdResult?.message || 'بعض المقاعد لم تعد متاحة', 'error');
      try {
        setSelectedTrip(await hydrateTripWithSeats(tripArg));
      } catch (_) {}
      return holdResult;
    }

    setSelectedTrip((prev) => ({
      ...prev,
      holdExpiresAt: holdResult.hold_expires_at || holdResult.holdExpiresAt || null,
    }));
    navigateTo('checkout');
    return holdResult;
  };

  const processDelayedRefund = async (tripToCancel) => {
"""
ua = replace_once(ua, old_before_refund, new_helpers, "shared booking helpers")

old_backend_return = """  if (backendLoading) return <div className="flex-1 grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200">جاري تحميل بياناتك من السحابة...</div>;
"""
new_effect = """  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

    const api = {
      snapshot() {
        return JSON.parse(JSON.stringify(qaStateRef.current));
      },

      async seedWallet(amount = 500, desc = 'شحن رصيد تجريبي (QA)') {
        const numericAmount = Math.max(0, Number(amount) || 0);
        if (!numericAmount) return 0;
        setWallet((prev) => prev + numericAmount);
        setTransactions((prev) => [
          {
            id: `QA-TOPUP-${Date.now()}`,
            type: 'credit',
            amount: numericAmount,
            date: getLocalDateInputValue(),
            desc,
          },
          ...prev,
        ]);
        await wait();
        return numericAmount;
      },

      async resetDemoState() {
        setWallet(0);
        setTransactions([]);
        setMyTrips([]);
        setPoints(0);
        setSubscription('none');
        setSelectedTrip(null);
        setSelectedSeats([]);
        setCurrentInvoice(null);
        setViewedTicket(null);
        navigateTo('main', 'home');
        await wait();
        return true;
      },

      async goHome() {
        navigateTo('main', 'home');
        await wait();
        return 'home';
      },

      async goWallet() {
        navigateTo('main', 'wallet');
        await wait();
        return 'wallet';
      },

      async goTrips() {
        navigateTo('main', 'trips');
        await wait();
        return 'trips';
      },

      async search(params = {}) {
        const next = {
          from: params.from || qaStateRef.current.searchParams?.from || 'القاهرة',
          to: params.to || qaStateRef.current.searchParams?.to || 'الإسكندرية',
          date: params.date || getLocalDateInputValue(),
          passengers: Number(params.passengers || qaStateRef.current.searchParams?.passengers || 1),
        };
        await handleSearch(next);
        await wait(250);
        return this.snapshot().searchResults;
      },

      async openTrip(index = 0) {
        const trips = qaStateRef.current.searchResults?.trips || [];
        const trip = trips[index];
        if (!trip) return null;

        try {
          const hydrated = await hydrateTripWithSeats(trip);
          setSelectedTrip(hydrated);
          setSelectedSeats([]);
          navigateTo('seats');
          await wait(150);
          return hydrated;
        } catch (error) {
          console.error('taree2yDev.openTrip error', error);
          throw error;
        }
      },

      async selectSeats(seatsOrCount = 1, tripOverride = null) {
        const trip = tripOverride || qaStateRef.current.selectedTrip;
        if (!trip?.seats?.length) return [];

        let chosen = [];
        if (Array.isArray(seatsOrCount)) {
          chosen = seatsOrCount;
        } else {
          const count = Math.max(1, Number(seatsOrCount) || 1);
          chosen = trip.seats
            .filter((seat) => seat.status === 'available' || (seat.status === 'held' && seat.heldByCurrentUser))
            .slice(0, count)
            .map((seat) => seat.number);
        }

        setSelectedSeats(chosen);
        await wait();
        return chosen;
      },

      async goCheckout(tripOverride = null, seatsOverride = null) {
        const result = await commitSeatSelection(
          tripOverride || qaStateRef.current.selectedTrip,
          seatsOverride || qaStateRef.current.selectedSeats,
        );
        await wait(150);
        return result;
      },

      async book(options = {}) {
        const state = qaStateRef.current;
        const trip = options.trip || state.selectedTrip;
        const seatNumbers = options.seatNumbers || state.selectedSeats;
        const passengers = Number(options.passengers || state.searchParams?.passengers || seatNumbers?.length || 1);

        const result = await createBookingForTrip({
          trip,
          seatNumbers,
          passengers,
          promoCode: options.promoCode || '',
          hasLuggage: Boolean(options.hasLuggage),
          rideToStation: Boolean(options.rideToStation),
          needsAccess: Boolean(options.needsAccess),
        });

        if (result?.ok) {
          finalizeBookingSuccess(result.booking, result.invoice);
          await wait(150);
        }

        return result;
      },

      async continueToTicket() {
        navigateTo('ticket');
        await wait();
        return 'ticket';
      },

      async smoke({
        from = 'القاهرة',
        to = 'الإسكندرية',
        passengers = 1,
        walletAmount = 1200,
      } = {}) {
        await this.seedWallet(walletAmount);
        await this.search({ from, to, passengers, date: getLocalDateInputValue() });

        const trip = await this.openTrip(0);
        if (!trip) return { ok: false, message: 'No trip found in smoke flow' };

        const seats = await this.selectSeats(passengers, trip);
        const holdResult = await this.goCheckout(trip, seats);
        if (!holdResult?.ok) return holdResult;

        const bookingResult = await this.book({ trip, seatNumbers: seats, passengers });
        if (bookingResult?.ok) {
          await this.continueToTicket();
        }
        return bookingResult;
      },
    };

    window.taree2yDev = api;
    return () => {
      if (window.taree2yDev === api) {
        delete window.taree2yDev;
      }
    };
  }, [activeTab, activeView, currentInvoice, myTrips, points, refreshCloudState, searchResults, searchParams, selectedSeats, selectedTrip, subscription, transactions, viewedTicket, wallet]);

  if (backendLoading) return <div className="flex-1 grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200">جاري تحميل بياناتك من السحابة...</div>;
"""
ua = replace_once(ua, old_backend_return, new_effect, "dev QA API effect")

old_seat_confirm = """            {activeView === 'seats' && selectedTrip && <SeatSelectionView trip={selectedTrip} passengers={searchParams.passengers} selectedSeats={selectedSeats} setSelectedSeats={setSelectedSeats} onConfirm={async () => {
              if (!selectedTrip?.instanceId) return navigateTo('checkout');
              const holdResult = await holdTripSeats({ tripInstanceId: selectedTrip.instanceId, seatNumbers: selectedSeats });
              if (!holdResult?.ok) { showToast(holdResult?.message || 'بعض المقاعد لم تعد متاحة', 'error'); try { setSelectedTrip(await hydrateTripWithSeats(selectedTrip)); } catch (_) {} return; }
              setSelectedTrip((prev) => ({ ...prev, holdExpiresAt: holdResult.hold_expires_at || holdResult.holdExpiresAt || null }));
              navigateTo('checkout');
            }} showToast={showToast} />}
"""
new_seat_confirm = """            {activeView === 'seats' && selectedTrip && <SeatSelectionView trip={selectedTrip} passengers={searchParams.passengers} selectedSeats={selectedSeats} setSelectedSeats={setSelectedSeats} onConfirm={async () => {
              await commitSeatSelection();
            }} showToast={showToast} />}
"""
ua = replace_once(ua, old_seat_confirm, new_seat_confirm, "SeatSelectionView onConfirm")

old_checkout = """            {activeView === 'checkout' && selectedTrip && <CheckoutView trip={selectedTrip} seats={selectedSeats} passengers={searchParams.passengers} wallet={wallet} subscription={subscription} onCreateBooking={async ({ trip, seatNumbers, passengers, promoCode, hasLuggage, rideToStation, needsAccess }) => {
              if (!trip?.instanceId) {
                return createDemoBookingResult({ trip, seatNumbers, passengers, promoCode, hasLuggage, rideToStation, needsAccess });
              }
              const result = await createBookingAtomic({ tripInstanceId: trip.instanceId, seatNumbers, passengers, promoCode, hasLuggage, rideToStation, needsAccess });
              if (result?.ok) await refreshCloudState({ silent: true, force: true });
              return result;
            }} onSuccess={(ticket, invoice) => {
              if (String(ticket?.bookingId || ticket?.id || '').startsWith('demo-')) {
                setMyTrips((prev) => [ticket, ...prev]);
              }
              setCurrentInvoice(invoice);
              setViewedTicket(ticket);
              navigateTo('invoice');
            }} showToast={showToast} openModal={setActiveModal} />}
"""
new_checkout = """            {activeView === 'checkout' && selectedTrip && <CheckoutView trip={selectedTrip} seats={selectedSeats} passengers={searchParams.passengers} wallet={wallet} subscription={subscription} onCreateBooking={createBookingForTrip} onSuccess={finalizeBookingSuccess} showToast={showToast} openModal={setActiveModal} />}
"""
ua = replace_once(ua, old_checkout, new_checkout, "CheckoutView handlers")

old_badge = """  return cloned.map((trip) => ({
    ...trip,
    badge:
      trip.badge ||
      (trip.instanceId || trip.id) === (cheapest.instanceId || cheapest.id)
        ? 'cheapest'
        : (trip.instanceId || trip.id) === (fastest.instanceId || fastest.id)
        ? 'fastest'
        : trip.class?.includes('VIP')
        ? 'vip'
        : null,
  }));
}
"""
new_badge = """  return cloned.map((trip) => {
    const tripKey = trip.instanceId || trip.id;
    const cheapestKey = cheapest.instanceId || cheapest.id;
    const fastestKey = fastest.instanceId || fastest.id;

    return {
      ...trip,
      badge:
        trip.badge ||
        (tripKey === cheapestKey
          ? 'cheapest'
          : tripKey === fastestKey
          ? 'fastest'
          : trip.class?.includes('VIP')
          ? 'vip'
          : null),
    };
  });
}
"""
ti = replace_once(ti, old_badge, new_badge, "trip badge precedence")

user_app.write_text(ua, encoding="utf-8")
trip_inventory.write_text(ti, encoding="utf-8")
print("[OK] App patch applied successfully")
PY

echo
echo "Patch completed."
echo "Backups stored in: $backup_dir"
echo
echo "Next steps:"
echo "  1) npm run dev"
echo "  2) open the app in the browser"
echo "  3) in browser console run:"
echo "       window.taree2yDev.snapshot()"
echo "       await window.taree2yDev.seedWallet(1000)"
echo "       await window.taree2yDev.search({ from: 'القاهرة', to: 'الإسكندرية', passengers: 1 })"
echo "       await window.taree2yDev.openTrip(0)"
echo "       await window.taree2yDev.selectSeats(1)"
echo "       await window.taree2yDev.goCheckout()"
echo "       await window.taree2yDev.book()"
echo "       await window.taree2yDev.continueToTicket()"
echo
echo "Or run the full smoke flow:"
echo "       await window.taree2yDev.smoke()"
