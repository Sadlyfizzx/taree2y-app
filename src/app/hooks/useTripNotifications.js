import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLogger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import {
  deliverUserNotification,
  dismissUserNotifications,
  listUserNotifications,
  markUserNotificationsRead,
  syncUserEngagement,
} from '../../lib/engagement';
import { withStationNames } from '../utils/stations';
import { ensureTicketIdentity } from '../utils/tripIdentity';

const log = createLogger('trip-notifications');
const STORAGE_KEY = 'taree2y_trip_notifications_v2';

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

function createLocalNotification({ eventKey, title, body, tripCode, routeLabel, timeLabel }) {
  const createdAt = new Date().toISOString();
  return {
    id: `${eventKey}-${Date.now()}`,
    eventKey,
    title,
    body,
    tripCode,
    routeLabel,
    timeLabel,
    createdAt,
    deliveredAt: createdAt,
    readAt: null,
    dismissedAt: null,
    campaignId: null,
    source: 'local_trip_runtime',
    category: 'trip',
    priority: 0,
    payload: {
      eventKey,
      tripCode,
      routeLabel,
      timeLabel,
    },
  };
}

async function notifyBrowser(title, body, tag) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    // eslint-disable-next-line no-new
    new Notification(title, { body, tag });
  }
}

function dedupeNotifications(localNotifications, serverNotifications) {
  const ordered = [...serverNotifications, ...localNotifications].sort((left, right) => {
    const leftTime = new Date(left.createdAt || left.deliveredAt || 0).getTime();
    const rightTime = new Date(right.createdAt || right.deliveredAt || 0).getTime();
    return rightTime - leftTime;
  });

  const map = new Map();

  ordered.forEach((entry) => {
    const key = String(entry.eventKey || entry.id || '').trim() || entry.id;
    if (!map.has(key)) {
      map.set(key, entry);
      return;
    }

    const current = map.get(key);
    if (current?.source === 'server') return;
    if (entry?.source === 'server') {
      map.set(key, entry);
      return;
    }

    const currentTime = new Date(current?.createdAt || 0).getTime();
    const nextTime = new Date(entry?.createdAt || 0).getTime();
    if (nextTime > currentTime) {
      map.set(key, entry);
    }
  });

  return [...map.values()].filter((entry) => !entry.dismissedAt);
}

export function useTripNotifications({ userId = '', trips = [], onNotify }) {
  const stored = useMemo(() => readStoredState(), []);
  const [localNotifications, setLocalNotifications] = useState(stored.notifications || []);
  const [serverNotifications, setServerNotifications] = useState([]);
  const firedKeysRef = useRef(new Set(stored.fired || []));
  const announcedServerIdsRef = useRef(new Set());
  const onNotifyRef = useRef(onNotify);

  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

  useEffect(() => {
    writeStoredState({
      notifications: localNotifications,
      fired: [...firedKeysRef.current],
    });
  }, [localNotifications]);

  const refreshServerNotifications = useCallback(
    async ({ announce = true } = {}) => {
      if (!userId) {
        setServerNotifications([]);
        return [];
      }

      await syncUserEngagement({ userId, context: { source: 'app_notifications' } });
      const items = await listUserNotifications({ userId, limit: 60 });
      setServerNotifications(items);

      if (announce) {
        items.forEach((entry) => {
          if (entry.readAt || entry.dismissedAt) return;
          if (announcedServerIdsRef.current.has(entry.id)) return;
          announcedServerIdsRef.current.add(entry.id);
          notifyBrowser(entry.title, entry.body, `server-${entry.id}`);
          onNotifyRef.current?.(entry);
        });
      }

      return items;
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) return undefined;

    refreshServerNotifications().catch((error) => {
      log.warn('initial_notification_refresh_failed', { userId, error });
    });

    const syncNow = () => {
      refreshServerNotifications().catch((error) => {
        log.warn('notification_refresh_failed', { userId, error });
      });
    };

    const channel = supabase
      .channel(`taree2y-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        syncNow,
      )
      .subscribe();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncNow();
    };

    const intervalId = window.setInterval(syncNow, 20000);
    window.addEventListener('focus', syncNow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncNow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [refreshServerNotifications, userId]);

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

          const maybeEmit = (eventKey, title, body) => {
            const entry = createLocalNotification({
              eventKey,
              tripCode: trip.publicTripCode,
              routeLabel,
              timeLabel,
              title,
              body,
            });

            firedKeysRef.current.add(eventKey);
            setLocalNotifications((currentValue) => [entry, ...currentValue].slice(0, 80));
            notifyBrowser(entry.title, entry.body, eventKey);
            onNotifyRef.current?.(entry);

            if (userId) {
              deliverUserNotification({
                userId,
                notification: {
                  source: 'trip_runtime',
                  category: 'trip',
                  title: entry.title,
                  body: entry.body,
                  dedupe_key: entry.eventKey,
                  payload: {
                    eventKey: entry.eventKey,
                    tripCode: entry.tripCode,
                    routeLabel: entry.routeLabel,
                    timeLabel: entry.timeLabel,
                  },
                },
              }).then(() => {
                refreshServerNotifications({ announce: false }).catch(() => {});
              });
            }
          };

          if (
            msUntilDeparture > 0 &&
            msUntilDeparture <= 20 * 60 * 1000 &&
            !firedKeysRef.current.has(reminderKey)
          ) {
            maybeEmit(
              reminderKey,
              'فاضل 20 دقيقة على التحرك',
              `رحلتك ${routeLabel} هتتحرك من ${trip.fromStationName} الساعة ${trip.departureTime}.`,
            );
          }

          if (now >= departure && now < arrival && !firedKeysRef.current.has(departedKey)) {
            maybeEmit(
              departedKey,
              'الرحلة بدأت',
              `رحلتك ${routeLabel} بدأت. افتح "تقدم الرحلة" وشوف الحالة الحالية.`,
            );
          }
        });
    };

    checkTrips();
    const intervalId = window.setInterval(checkTrips, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [refreshServerNotifications, trips, userId]);

  const notifications = useMemo(
    () => dedupeNotifications(localNotifications, serverNotifications),
    [localNotifications, serverNotifications],
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const markAllRead = async () => {
    setLocalNotifications((currentValue) =>
      currentValue.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })),
    );

    if (userId) {
      await markUserNotificationsRead({ userId });
      await refreshServerNotifications({ announce: false });
    }
  };

  const clearNotifications = async () => {
    firedKeysRef.current = new Set();
    setLocalNotifications([]);

    if (userId) {
      await dismissUserNotifications({ userId });
      await refreshServerNotifications({ announce: false });
    }
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
    refreshNotifications: refreshServerNotifications,
  };
}
