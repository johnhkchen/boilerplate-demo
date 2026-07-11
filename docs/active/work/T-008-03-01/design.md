# Design — T-008-03-01 unified dashboard page

## Decision summary

Replace the current immediately-visible submit form and confirmation swap with a two-state page:

1. a locked passcode form;
2. one unlocked dashboard containing the submission form and live checklist.

A successful gated feed request is the unlock proof. The typed passcode is copied into a closure
variable and the password input is cleared. Every GET, POST, PATCH, and DELETE uses that closure
value in `x-demo-passcode`. No browser persistence or second credential is introduced.

## Option 1 — retain the submit form and add a list below it

This is the smallest markup change. The passcode field could continue to accompany submission,
while the list separately asks for or reuses its value.

Advantages:

- minimal changes to the existing successful-submit UI;
- small Playwright adjustment;
- current validation and confirmation remain intact.

Disadvantages:

- the page remains visibly submit-first rather than passcode-first;
- wrong credentials are not refused at unlock time;
- a second credential prompt or ambiguous list-loading trigger is likely;
- the passcode stays coupled to a form rather than the page session;
- it does not clearly remove the separate submit-only surface.

Rejected because it conflicts with the acceptance’s single-unlock dashboard model.

## Option 2 — server-render entries after a form POST

The passcode could be posted through a page action and the server could render the dashboard.

Advantages:

- less browser-side rendering code;
- initial entries arrive with the unlocked HTML response.

Disadvantages:

- a static page would become a dynamic page;
- carrying authorization across later operations would require cookies, hidden fields, query data,
  or another server-issued session mechanism;
- cookies or a session are broader than the low-stakes shared-knock architecture;
- hidden fields would replicate the passcode into markup and form bodies;
- it changes deployment behavior without backend need.

Rejected because the existing static-first page and header-gated APIs already fit the requirement.

## Option 3 — client-side unlock and dashboard

The lock form performs `GET /api/backstage/feed` with the typed passcode. On 200, the page retains
the passcode only in the inline module’s closure, clears the password input, hides the gate, renders
the returned entries, and reveals the dashboard.

Advantages:

- directly proves the passcode before exposing dashboard content;
- preserves the page as a static asset;
- composes all four existing API methods;
- keeps one credential in one ephemeral location;
- reload naturally relocks the page;
- enables deterministic browser acceptance testing.

Disadvantages:

- requires a small client-side renderer and state machine;
- browser DOM tests must cover more transitions;
- a refresh is required to learn the server-assigned id after POST.

Chosen because it matches both the current architecture and the precise ticket semantics.

## Passcode lifetime

The initial value exists in the password input while locked. On successful feed response it moves
to a module-scoped `let unlockedPasscode` captured by event handlers, and the input is cleared.
The value is never placed in DOM text, an attribute, a URL, a body, storage, a cookie, or global
`window` state. Navigating away or reloading destroys it.

The closure is page memory, not an authentication session. Server gates remain authoritative on
every request. If a later operation receives 401 or 403, the page shows an operation error; it does
not silently persist or reacquire credentials.

## Unlock behavior

- Blank input is refused locally with focus returned to the field.
- Submit disables the unlock button and announces “Unlocking…”.
- GET 200 validates the feed envelope before accepting it.
- GET 401 or 403 shows a clear wrong-passcode message and remains locked.
- Other failures show a bounded availability message and remain locked.
- Successful unlock clears the password input, hides the gate, reveals the dashboard, renders the
  checklist, and focuses the dashboard heading.

Using the feed as the unlock probe has a useful property: authorization and initial state arrive
from one request, so there is no unlocked-but-not-loaded intermediate state.

## Dashboard composition

The unlocked surface contains two regions:

- “Add something” — the existing type, URL, text submission controls without a passcode field;
- “The list” — status copy plus an ordered or unordered native list of entry cards.

The list is a checklist in the behavioral sense: each entry has a native checkbox reflecting
`completedAt !== null`. Incomplete checkboxes are actionable. Completed checkboxes are checked and
disabled because the backend exposes no uncomplete operation. Text decoration and a textual
“Complete” state ensure completion is not color-only.

## Entry rendering

Render with DOM constructors and `textContent`, never interpolated HTML. Each entry includes:

- checkbox with an accessible label derived from the entry id;
- type label;
- submitted timestamp, formatted when valid and otherwise shown verbatim;
- entry text preserving line breaks;
- optional http(s) link opened safely with `rel="noreferrer"`;
- delete button with an entry-specific accessible label.

The feed contract is runtime-validated before rendering. Entry ids must be positive integers;
types and strings must match the canonical contract; completion must be null or a string.

## Refresh strategy

After a successful POST, PATCH, or DELETE, fetch the feed again and replace the in-memory entries
and list DOM from the canonical response. This costs one extra read per mutation but prevents the
browser from inventing ids, timestamps, ordering, or derived state.

Alternatives were local optimistic mutation and composing PATCH/DELETE responses. They reduce a
request but duplicate canonical mapping and cannot fully construct a newly submitted entry because
POST does not return its database id. A single refresh policy is simpler and consistent.

## Submission behavior

Preserve the current friendly validation and server-authoritative validation. Remove only the
passcode check and field. On 201:

- clear URL and text;
- keep the selected type;
- refresh the feed;
- show a polite success status;
- focus the refreshed entry status/heading area.

The old confirmation panel is removed. The list itself is the unified confirmation: the newly
created entry appears in canonical order in the same surface.

## Completion behavior

Changing an incomplete checkbox to checked sends PATCH to its id route with the same passcode
header. While pending, disable the checkbox and mark the entry busy. On success, refresh the feed.
On failure, restore the checkbox and show a dashboard error. Completed rows remain checked and
disabled, honestly matching the absence of an uncomplete API.

## Delete behavior

Delete is irreversible, so use the browser’s native confirmation prompt before the request. The
prompt contains no entry content or passcode. On confirmation, disable that entry’s controls, send
DELETE, then refresh. Cancellation makes no request. Failure restores the controls via rerender or
local reset and announces an error.

## Error and concurrency model

The page supports one user interaction at a time per control. Submission disables its button;
entry mutations disable the addressed entry. Refresh replaces all cards with server state.
Because the shared dashboard is collaborative, a feed refresh can also incorporate another
visitor’s changes. There is no polling requirement in this ticket.

Errors remain scoped:

- unlock errors stay beside the gate;
- submission validation/API errors stay beside the form;
- list refresh and management errors use a list-level alert;
- successful mutations use a polite list status.

## Accessibility and phone layout

- Native forms, labels, checkboxes, and buttons remain keyboard and screen-reader operable.
- Dashboard heading receives focus after unlock.
- Alerts use assertive live regions; success/status copy uses polite announcements.
- Entry actions meet the shared control-height touch target.
- Cards stack vertically on phone widths.
- Link and text content wrap rather than overflow.
- Completed state uses checked control, text label, and visual treatment.
- Busy buttons communicate through disabled state and temporary text.

## Test design

Extend the existing Pixel 5 Playwright flow into one continuous acceptance:

1. open the locked page and prove the submit/list dashboard is hidden;
2. attempt a wrong passcode and prove refusal;
3. unlock with the correct passcode and prove existing entries render;
4. submit a marked entry and prove it appears without another credential;
5. complete that entry from its checklist card and verify checked state;
6. submit a second marked entry;
7. delete the second entry and prove it disappears;
8. read the feed with the same known test passcode to verify canonical persistence.

This covers “existing entries” even on an initially empty database by seeding through the API
before page unlock. The seed and all UI operations share the deterministic flow passcode.

## Leak evidence

Build the application, serve the built Worker locally, and execute the existing leak checker with
`DEMO_SIGNING_KEY` set to the same marker used as `DEMO_PASSCODE`. This reuses the checker’s exact
asset scan to prove the runtime passcode value is absent from browser assets. Source inspection and
the page design additionally prove no browser persistence APIs are used.

## Rejected scope

- no login, identity, roles, or accounts;
- no cookie or token exchange;
- no local/session storage;
- no API, store, migration, or environment change;
- no uncomplete behavior without a corresponding backend contract;
- no polling or real-time synchronization;
- no bulk mutations;
- no separate management route or page;
- no passcode reset or rotation UI.
