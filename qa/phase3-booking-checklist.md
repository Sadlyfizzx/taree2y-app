# Phase 3 booking QA checklist

## Production gate

Run before shipping any promo / checkout / booking changes:

```bash
npm run test:booking
npm run build
```

## Automated coverage in this patch

- `src/lib/promoEngine.test.js`
  - normalizes successful promo previews
  - fails safely if preview RPC is missing
  - fails safely on unexpected RPC errors
  - normalizes popup offer payloads

- `src/app/screens/CheckoutView.test.jsx`
  - promo is revalidated again on final booking confirm
  - booking stops if final promo revalidation fails
  - booking stops if wallet becomes insufficient after final promo revalidation
  - booking stops when seat hold is expired

## Manual QA matrix

### Promo correctness
- Valid promo, active, eligible route, enough wallet
- Invalid promo
- Expired promo
- Inactive promo
- First-trip promo on user with prior successful booking
- Minimum amount not reached
- Route restricted promo on wrong route
- Global limit exhausted
- Per-user limit exhausted

### Booking correctness
- Search -> seats -> checkout -> confirm -> invoice -> ticket
- Double tap confirm should not create duplicate booking
- Seat hold expiry during checkout
- Promo preview accepted, final confirm rejected
- Final accepted discount shown consistently in invoice and ticket totals

### Compatibility
- Ticket export still works
- Public tracking link still works
- Wallet balance reflects final accepted booking amount only
- Arabic copy stays natural in rejection / success messages
- Mobile checkout layout still readable

## Backend must still be true source of truth

Even with these tests, Phase 3 is only production-complete when `create_booking_atomic`:

1. revalidates promo inside the transaction
2. calls `app_private.consume_app_promo(...)`
3. persists `promo_code`, `promo_campaign_id`, `promo_discount_amount`
4. computes the final payable amount from backend truth
