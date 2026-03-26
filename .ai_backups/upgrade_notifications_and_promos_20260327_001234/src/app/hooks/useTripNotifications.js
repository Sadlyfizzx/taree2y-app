import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLogger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import {
  dismissUserNotifications,
  listUserNotifications,
  markUserNotificationsRead,
  syncUserEngagement,
} from '../../lib/engagement';

const log = createLogger('trip-notifications');

async function notifyBrowser(title, body, tag) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    // eslint-disable-next-line no-new
    new Notification(title, { body, tag });
  }
}

export function useTripNotifications({ userId = '', trips: _trips = [], onNotify }) {
  const [serverNotifications, setServerNotifications] = useState([]);
  const announcedServerIdsRef = useRef(new Set());
  const onNotifyRef = useRef(onNotify);

  useEffect(() => {
    onNotifyRef.current = onNotify;
  }, [onNotify]);

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
          if (!entry?.id || entry.readAt || entry.dismissedAt) return;
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

  const notifications = useMemo(
    () =>
      [...serverNotifications]
        .filter((entry) => !entry?.dismissedAt)
        .sort((left, right) => {
          const leftTime = new Date(left?.createdAt || left?.deliveredAt || 0).getTime();
          const rightTime = new Date(right?.createdAt || right?.deliveredAt || 0).getTime();
          return rightTime - leftTime;
        }),
    [serverNotifications],
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications],
  );

  const markAllRead = async () => {
    if (!userId) return;
    await markUserNotificationsRead({ userId });
    await refreshServerNotifications({ announce: false });
  };

  const clearNotifications = async () => {
    if (!userId) {
      setServerNotifications([]);
      return;
    }

    await dismissUserNotifications({ userId });
    await refreshServerNotifications({ announce: false });
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
      message: 'إشعارات الجهاز لم تُفعل. هتفضل الإشعارات تظهر من السيرفر فقط جوه التطبيق.',
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
