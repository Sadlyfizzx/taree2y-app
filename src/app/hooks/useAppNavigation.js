import { useCallback, useEffect, useState } from 'react';

const ROUTE_TO_STATE = {
  '/': { view: 'main', page: 'home' },
  '/home': { view: 'main', page: 'home' },
  '/bookings': { view: 'main', page: 'bookings' },
  '/tickets': { view: 'main', page: 'tickets' },
  '/wallet': { view: 'main', page: 'wallet' },
  '/profile': { view: 'main', page: 'profile' },
  '/search': { view: 'search', page: 'home' },
  '/seats': { view: 'seats', page: 'home' },
  '/payment': { view: 'checkout', page: 'home' },
  '/booking-success': { view: 'invoice', page: 'home' },
  '/ticket': { view: 'ticket', page: 'tickets' },
  '/trip-status': { view: 'tracking', page: 'tickets' },
};

const STATE_TO_PATH = {
  'main:home': '/home',
  'main:bookings': '/bookings',
  'main:tickets': '/tickets',
  'main:wallet': '/wallet',
  'main:profile': '/profile',
  'search:home': '/search',
  'seats:home': '/seats',
  'checkout:home': '/payment',
  'invoice:home': '/booking-success',
  'ticket:tickets': '/ticket',
  'tracking:tickets': '/trip-status',
};

export function resolveStateFromPath(pathname) {
  return ROUTE_TO_STATE[pathname] || { view: 'main', page: 'home' };
}

export function createPath(view, page) {
  return STATE_TO_PATH[`${view}:${page}`] || '/home';
}

function scrollViewportToTop(behavior = 'auto') {
  if (typeof window === 'undefined') return;

  const safeBehavior = behavior === 'smooth' ? 'smooth' : 'auto';
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  const body = typeof document !== 'undefined' ? document.body : null;

  const tryScroll = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: safeBehavior });
    } catch {
      window.scrollTo(0, 0);
    }

    if (root) root.scrollTop = 0;
    if (body) body.scrollTop = 0;

    if (typeof document !== 'undefined') {
      const candidates = document.querySelectorAll(
        '[data-scroll-root="true"], .app-shell-scroll, .app-page-scroll, .app-page-frame, main, [role="main"]',
      );
      candidates.forEach((node) => {
        if (node && typeof node.scrollTop === 'number') {
          node.scrollTop = 0;
        }
      });
    }
  };

  tryScroll();
}

export function scheduleViewportScrollReset(behavior = 'auto') {
  if (typeof window === 'undefined') return;

  scrollViewportToTop(behavior);

  [0, 40, 120, 220, 360, 520, 760, 980].forEach((delay) => {
    window.setTimeout(() => {
      scrollViewportToTop('auto');
    }, delay);
  });

  window.requestAnimationFrame(() => {
    scrollViewportToTop('auto');
    window.requestAnimationFrame(() => {
      scrollViewportToTop('auto');
    });
  });
}

export function useAppNavigation({ activeModal = '', onNavigate } = {}) {
  const initialRoute = resolveStateFromPath(
    typeof window !== 'undefined' ? window.location.pathname || '/home' : '/home',
  );
  const [activePage, setActivePage] = useState(initialRoute.page);
  const [activeView, setActiveView] = useState(initialRoute.view);

  const syncLocation = useCallback((view, page, { replace = false } = {}) => {
    if (typeof window === 'undefined') return;

    const path = createPath(view, page);
    const currentPath = window.location.pathname || '/home';
    if (currentPath === path) return;

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', path);
  }, []);

  const navigateTo = useCallback(
    (nextView, nextPage = activePage, options = {}) => {
      setActiveView(nextView);
      setActivePage(nextPage);
      syncLocation(nextView, nextPage, options);
      onNavigate?.({ activeModal, nextView, nextPage, options });
      scheduleViewportScrollReset('auto');
    },
    [activeModal, activePage, onNavigate, syncLocation],
  );

  const goBack = useCallback(() => {
    if (activeView === 'invoice') navigateTo('ticket', 'tickets');
    else if (activeView === 'checkout') navigateTo('seats');
    else if (activeView === 'seats') navigateTo('search');
    else if (activeView === 'search') navigateTo('main', 'home');
    else if (activeView === 'ticket') navigateTo('main', 'tickets');
    else if (activeView === 'tracking') navigateTo('ticket', 'tickets');
    else navigateTo('main', 'home');
  }, [activeView, navigateTo]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePopState = () => {
      const next = resolveStateFromPath(window.location.pathname || '/home');
      setActiveView(next.view);
      setActivePage(next.page);
      scheduleViewportScrollReset('auto');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    activePage,
    activeView,
    navigateTo,
    goBack,
  };
}
