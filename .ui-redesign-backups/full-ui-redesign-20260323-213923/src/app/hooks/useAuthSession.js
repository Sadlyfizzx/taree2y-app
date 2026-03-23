import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createLogger } from '../../lib/logger';

const log = createLogger('auth-session');

export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const applyFallbackProfile = async (user) => {
      const fallbackProfile = {
        id: user.id,
        display_name:
          user?.user_metadata?.display_name ||
          user?.email?.split('@')[0] ||
          'مستخدم',
        phone: user?.user_metadata?.phone || '',
      };

      if (mounted) setProfile(fallbackProfile);

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: fallbackProfile.display_name,
        phone: fallbackProfile.phone || null,
      });

      if (error) {
        log.warn('profile_bootstrap_failed', {
          userId: user.id,
          error,
        });
      } else {
        log.info('profile_bootstrap_completed', {
          userId: user.id,
        });
      }
    };

    const loadProfile = async (user) => {
      const userId = user?.id;
      if (!userId) {
        if (mounted) setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        log.error('profile_load_failed', {
          userId,
          error,
        });
        await applyFallbackProfile(user);
        return;
      }

      if (!data) {
        log.warn('profile_missing_row', {
          userId,
        });
        await applyFallbackProfile(user);
        return;
      }

      setProfile(data);
      log.debug('profile_loaded', {
        userId,
      });
    };

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentSession = data.session ?? null;
        if (!mounted) return;

        setSession(currentSession);
        if (currentSession?.user?.id) {
          await loadProfile(currentSession.user);
        } else {
          setProfile(null);
        }
      } catch (error) {
        log.error('bootstrap_failed', { error });
        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);

      if (!nextSession?.user?.id) {
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      window.setTimeout(() => {
        if (!mounted) return;
        loadProfile(nextSession.user).finally(() => {
          if (mounted) setAuthLoading(false);
        });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, profile, authLoading };
}
