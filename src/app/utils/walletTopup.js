export function buildWalletTopUpLink({ userId, amount = '', requestId = '' }) {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const url = new URL(`${origin}/public/wallet-topup`);
  if (userId) url.searchParams.set('uid', userId);
  if (amount) url.searchParams.set('amount', String(amount));
  if (requestId) url.searchParams.set('req', String(requestId));
  return url.toString();
}

export function generateWalletTopupRequestId(userId = '') {
  const now = new Date();
  const parts = [
    'TOP',
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(Math.abs(hashCode(userId || 'guest'))).slice(0, 6),
  ];
  return parts.join('-');
}

function hashCode(value) {
  let hash = 0;
  for (let index = 0; index < String(value).length; index += 1) {
    hash = (hash << 5) - hash + String(value).charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
