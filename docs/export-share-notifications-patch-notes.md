# Export / Share / Notifications patch

## What changed
- Replaced raw-looking long visible codes with:
  - `publicTripCode`
  - `driverRunCode`
- Added modern ticket export:
  - PNG export
  - PDF export
- Added a better QR that points to a public tracking page.
- Added public trip tracking mode using:
  - `?publicTrip=...`
- Added trip notifications inside the app:
  - 20 minutes before departure
  - when trip starts
- Added notification center modal.

## Current limitation
- Browser/device notifications work when the app is open and the browser allows notifications.
- Full background push notifications would need a later service worker + push provider phase.
