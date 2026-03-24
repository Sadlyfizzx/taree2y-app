import { useEffect, useMemo, useRef, useState } from 'react';
import { withStationNames } from '../utils/stations';
import { ensureTicketIdentity } from '../utils/tripIdentity';

const STORAGE_KEY = 'taree2y_trip_notifications_v1';

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { notifications: [], fired: [] };
  } catch {
    return { notifications: [], fired: [] };
  }
}

function writeStoredState(nextValue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
  } catch {
    // ignore storage failures
  }
}

function getDepartureDate(trip) {
  return new Date(`${trip.date}T${trip.departureTime}:00`);
}

function getArrivalDate(trip) {
  const departure = getDepartureDate(trip);
  const arrival = new Date(`${trip.date}T${trip.arrivalTime}:00`);
  if (arrival < departure) {
    arrival.setDate(arrival.getDate() + 1);
  }
  return arrival;
}

function createNotification({ eventKey, title, body, tripCode, routeLabel, timeLabel }) {
  return {
    id: `${eventKey}-${Date.now()}`,
    eventKey,
    title,
    body,
    tripCode,
    routeLabel,
    timeLabel,
    createdAt: Date.now(),
    readAt: null,
  };
}

async function notifyBrowser(title, body, tag) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    // eslint-disable-next-line no-new
    new Notification(title, { body, tag });
  }
}

export function useTripNotifications({ trips = [], onNotify }) {
  const stored = useMemo(() => readStoredState(), []);
  const [notifications, setNotifications] = useState(stored.notifications || []);
  const firedKeysRef = useRef(new Set(stored.fired || []));
  const onNotifyRef = useRef(onNotify);

  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  useEffect(() => {
    writeStoredState({
      notifications,
      fired: [...firedKeysRef.current],
    });
  }, [notifications]);

  useEffect(() => {
    const checkTrips = () => {
      const now = Date.now();

      trips
        .map((trip) => withStationNames(ensureTicketIdentity(trip)))
        .filter((trip) => trip?.status === 'upcoming')
        .forEach((trip) => {
          const departure = getDepartureDate(trip).getTime();
          const arrival = getArrivalDate(trip).getTime();
          const msUntilDeparture = departure - now;
          const routeLabel = `${trip.from} → ${trip.to}`;
          const timeLabel = `${trip.departureTime} · ${trip.date}`;
          const reminderKey = `reminder-20-${trip.publicTripCode}`;
          const departedKey = `departed-${trip.publicTripCode}`;

          if (
            msUntilDeparture > 0 &&
            msUntilDeparture <= 20 * 60 * 1000 &&
            !firedKeysRef.current.has(reminderKey)
          ) {
            const entry = createNotification({
              eventKey: reminderKey,
              tripCode: trip.publicTripCode,
              routeLabel,
              timeLabel,
              title: 'فاضل 20 دقيقة على التحرك',
              body: `رحلتك ${routeLabel} هتتحرك من ${trip.fromStationName} الساعة ${trip.departureTime}.`,
            });

            firedKeysRef.current.add(reminderKey);
            setNotifications((currentValue) => [entry, ...currentValue].slice(0, 40));
            notifyBrowser(entry.title, entry.body, reminderKey);
            onNotifyRef.current?.(entry);
          }

          if (
            now >= departure &&
            now < arrival &&
            !firedKeysRef.current.has(departedKey)
          ) {
            const entry = createNotification({
              eventKey: departedKey,
              tripCode: trip.publicTripCode,
              routeLabel,
              timeLabel,
              title: 'الرحلة بدأت',
              body: `رحلتك ${routeLabel} بدأت. افتح "تقدم الرحلة" وشوف الحالة الحالية.`,
            });

            firedKeysRef.current.add(departedKey);
            setNotifications((currentValue) => [entry, ...currentValue].slice(0, 40));
            notifyBrowser(entry.title, entry.body, departedKey);
            onNotifyRef.current?.(entry);
          }
        });
    };

    checkTrips();
    const intervalId = window.setInterval(checkTrips, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [trips]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const markAllRead = () => {
    setNotifications((currentValue) =>
      currentValue.map((item) =>
        item.readAt ? item : { ...item, readAt: Date.now() },
      ),
    );
  };

  const clearNotifications = () => {
    firedKeysRef.current = new Set();
    setNotifications([]);
  };

  const requestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        ok: false,
        message: 'المتصفح الحالي لا يدعم إشعارات الجهاز.',
      };
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return {
        ok: true,
        message: 'تم تفعيل إشعارات الجهاز.',
      };
    }

    return {
      ok: false,
      message: 'إشعارات الجهاز لم تُفعل. هتفضل الإشعارات تظهر جوه التطبيق فقط.',
    };
  };

  return {
    notifications,
    unreadCount,
    markAllRead,
    clearNotifications,
    requestBrowserPermission,
  };
}
