import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mounted) return;

      if (error) {
        console.error(error);
        setProfile(null);
        return;
      }

      setProfile(data);
    };

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session ?? null;

      if (!mounted) return;

      setSession(currentSession);

      if (currentSession?.user?.id) {
        await loadProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }

      if (mounted) setAuthLoading(false);
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);

      if (!nextSession?.user?.id) {
        setProfile(null);
        return;
      }

      setTimeout(() => {
        if (!mounted) return;
        loadProfile(nextSession.user.id);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, profile, authLoading };
}
