# Specification: Employee Shift Countdown Timer Web App

## Core Objective
Create a lightweight, responsive frontend timer where a user enters their daily login time and sees a real-time countdown to the earliest allowed logout time.

## Core Rules and Logic
1. **Standard Shift Length:** A standard shift is exactly **9 hours**.
2. **Earliest Out Rule:** The target is never earlier than **04:00 PM** on the Time In date.
   * Time In = 06:50 AM -> 9 hours gives 03:50 PM, so the target is adjusted to **04:00 PM**.
   * Time In = 07:31 AM -> the standard target is **04:31 PM**.
3. **Overnight Target:** If Time In plus 9 hours crosses midnight, show the next-day target explicitly.

## User Interface Requirements
* **Entry State:** Within the timer region, show only one Time In input centered horizontally and vertically. The persistent ad region, theme toggle, and Privacy action remain available outside it.
* **Transition:** A valid pasted value immediately activates the shift. A manually typed value activates when the user presses Enter.
* **Result State:** Within the timer region, hide the input and show only the shift status, large signed countdown, exact target logout time, and a subtle Reset action. The persistent elements outside the timer region remain unchanged.
* **Reset:** Clear the saved shift and return to an empty centered input. No separate Edit action is required.
* **Restore:** If a valid saved shift exists after refresh, open directly in the result state without showing the input.
* **Appearance:** Use only black, white, and necessary neutral grays. Follow the operating system's light or dark preference until the user chooses a manual override.
* **Theme Toggle:** Keep a compact switch fixed in the top-right corner in both app states. Show a moon on the left, a sun on the right, and slide the thumb beneath the active mode. Persist a manual Light or Dark choice locally.
* **Advertising:** Reserve one persistent manual ad region outside the timer's entry/result state switching while its request is pending or filled. When AdSense marks the unit unfilled, hide the unit, collapse its empty slot, and keep the page shell at viewport height so the timer remains centered. At widths of 1100px and above, place a filled unit in a vertically centered right rail. Below 1100px, place it inline beneath the timer and keep it normally visible without scrolling. Auto ads are managed through the AdSense dashboard; do not add multiple manual placements in the page source.
* **Privacy:** Keep a compact Privacy action fixed at the safe bottom-right edge of the viewport. Reserve footer clearance so it does not collide with content at the bottom of the page. It opens an accessible centered in-page dialog describing local timer/theme storage and advertising data use, with links to Google's partner-site information and ad settings.
* **Excluded UI:** Do not show branding, headings, descriptions, gradients, cards, decorative icons, help copy outside the Privacy dialog, normalized input, or a calculation proof.

## Input and Status Requirements
* Accept common time-only formats such as `07:31`, `7:31 AM`, and `06:57:07 AM`.
* Reject invalid values, arbitrary surrounding text, and times later than the current local time.
* Show **Shift in Progress**, **Final Stretch** during the last 15 minutes, **Shift Over** at zero, and **Extended Time** after the target passes.
* Continue the timer below zero as `-HH:MM:SS` to show time worked beyond the target.
* Keep the `remaining` caption for positive and zero values, then hide it during Extended Time.
* Restore Extended Time through the target's local calendar date, then discard the saved shift after midnight.

## Technical Requirements
* Use static HTML, CSS, and vanilla JavaScript separated into their own files and folders.
* Use no external frameworks, backend, or database. Do not load remote assets except Google's publisher code after AdSense activation and the user-opened links in the Privacy dialog.
* Persist the active Time In locally so an eligible shift survives refresh.
* Treat the browser's local clock and timezone as authoritative.
* Keep the application host-independent by using relative asset paths and no hardcoded production hostname.
* Load the AdSense publisher script once from the document head for script-based site verification and Auto ads, and initialize responsive manual ad unit `8471165698` once in the persistent ad region.
* Timer ticks, resets, theme changes, and restored sessions must not recreate the ad unit.
* If AdSense injects ancestor sizing overrides while collapsing an unfilled unit, remove only those injected height constraints so the timer remains centered.

## Deployment and AdSense Activation
* Publish the repository through GitHub Pages at `timer.gl3o.me`. Keep the root `CNAME` file in the Pages publishing source and configure the same custom domain in the repository's Pages settings.
* Keep asset references relative so the application works from the custom-domain root without a repository-name path prefix.
* Do not submit preview deployments for review or intentional monetization.
* The publisher script and responsive ad unit use publisher `pub-3861917167642750`; the ad unit uses slot `8471165698`.
* Configure Google's consent-management platform for Consent, Manage options, and Do not consent before requesting review.
* Add and verify the production site in AdSense using the publisher script, then wait until the site is eligible before serving ads there. Auto ads and manual ad units do not bypass site registration or review.
* AdSense approval and revenue are external outcomes and are not guaranteed by the implementation.
