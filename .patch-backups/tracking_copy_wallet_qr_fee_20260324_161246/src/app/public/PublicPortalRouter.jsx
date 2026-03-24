import React from 'react';
import PublicTripTrackingView from './PublicTripTrackingView';
import PublicWalletTopUpView from './PublicWalletTopUpView';
import { getPublicTripTokenFromPath, isPublicPortalPath } from './publicPortal';

export { isPublicPortalPath } from './publicPortal';

export default function PublicPortalRouter() {
  const pathname = window.location.pathname || '/';

  if (pathname.startsWith('/public/wallet-topup')) {
    return <PublicWalletTopUpView />;
  }

  const token = getPublicTripTokenFromPath(pathname);
  if (token) {
    return <PublicTripTrackingView token={token} />;
  }

  return null;
}
