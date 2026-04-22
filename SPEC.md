# CryptBoard.io Specification

## 1. Purpose

CryptBoard.io is an anonymous encrypted web clipboard and lightweight chat for transferring text and files between devices or people without account registration.

The project combines:

- a minimal PHP backend with Redis for transient transport and session state
- a browser-heavy frontend that owns identity, encryption, receiver management, message persistence, file chunking, rendering, and most application logic

The core design principle is: the server transports opaque payloads and authenticates sessions, while end-user data protection is primarily implemented in the browser.

## 2. Product Scope

### Main user-visible features

- anonymous session bootstrap without registration
- client-side RSA keypair generation and persistence
- exchange of public keys and UIDs between peers
- text messaging
- file transfer with chunking and client-side reconstruction
- image preview for loaded image files
- receiver/contact list with avatars derived from UID + public key
- deterministic avatars used as a simple visual integrity check for the `uid + public_key` pair during key exchange
- optional "Resend to new" mode: when enabled, previously sent local text/file/key-share messages are re-sent to a newly added receiver after receiving their add-contact packet
- multi-tab coordination
- multilingual UI: English, Russian, Simplified Chinese
- kill-session workflow that clears both server and browser state
- optional incoming-message sound notifications

### Non-goals in the current implementation

- no permanent message history on the server
- no account system
- no server-side receiver/contact storage
- no end-to-end delivery acknowledgements beyond current polling/read semantics
- no offline caching strategy in the service worker
- no automated test suite in the repository

## 3. High-Level Architecture

## 3.1 Runtime split

- Backend:
  - PHP-FPM application under `web-app/public/index.php`
  - custom micro-framework in `web-app/microfw/*`
  - Redis as the only server-side state store
- Frontend:
  - SSR shell rendered by PHP templates
  - application runtime in `web-app/public/js/frontend.js`
  - shared utilities and cross-tab primitives in `web-app/public/js/shared.js`
  - browser persistence in `localStorage` and `localforage`

## 3.2 Responsibility split

- Server responsibilities:
  - issue and refresh JWTs
  - validate bearer tokens on protected routes
  - keep transient session mappings in Redis
  - store queued messages and expose them through polling endpoints
  - render the HTML shell and runtime config
- Browser responsibilities:
  - generate and store RSA keys
  - encrypt/decrypt payloads
  - manage receiver list
  - persist local message history and files
  - chunk and reconstruct files
  - render all UI states
  - coordinate tabs
  - manage sound, language, clipboard helpers, and file queue

## 4. Backend Specification

## 4.1 Entry point and error handling

Primary entry point: `web-app/public/index.php`

Behavior:

- enables PHP error display
- converts PHP errors into exceptions
- converts uncaught exceptions and fatal shutdown errors into JSON error responses via `echo_error`
- boots the micro-framework and controller
- executes `Router::run()`

## 4.2 Micro-framework

Location: `web-app/microfw/*`

### `lib.php`

Provides:

- `render()` template rendering with optional layout
- `get()` / `post()` request helpers
- `echo_json()` and `echo_error()`
- `md5_file_or_skip()` for cache-busting
- `get_conf()` environment loader

`get_conf()` resolution order:

1. process environment via `getenv()`
2. `web-app/.env`
3. provided default

The `.env` parser is custom and intentionally simple:

- supports `KEY=VALUE`
- converts `true`/`false`, integers, and floats
- does not implement advanced dotenv syntax

### `route.php`

Provides `Router` with:

- plain or regexp route registration
- middleware registration
- per-route method constraints
- simple throttle helper backed by Redis

Behavior of `Router::run()`:

- matches against `$_SERVER['REQUEST_URI']`
- runs all middlewares before handler execution
- returns JSON automatically if handler returns an array
- returns raw buffered output otherwise
- converts `ApiException` into JSON error objects with HTTP 200
- converts other throwables into JSON error objects with HTTP 500

Important implication:

- many API-level failures are signaled in the JSON body, not through non-200 HTTP status codes

Intentional error-status split:

- HTTP 200 + `{error: ...}` is used for expected, programmatically catchable runtime failures
- these include business/application-level failures represented by `ApiException` subclasses such as auth, JWT, send, and throttling errors
- HTTP 500 is reserved for unexpected failures outside the normal application error model
- in other words, `200` means “the application handled the request and produced a known error result”, while `500` means “something unplanned broke during execution”

#### Registered middlewares

There is currently one registered router middleware, defined in `web-app/app/controller.php`.

Current middleware list:

- Authorization-header pre-read middleware
  - calls `get_nginx_headers()`
  - checks whether `Authorization` exists
  - assigns it to a local variable
  - has no observable side effects in the current codebase

Practical meaning:

- middleware infrastructure exists and is executed on every request
- current auth enforcement does not depend on this middleware
- bearer-token validation is implemented later in route handlers through `JWTH::auth_bearer(...)`
- the existing middleware should be treated as a legacy/no-op placeholder unless expanded in future

### `storage.php`

Provides a thin JSON wrapper around Redis:

- simple key-value get/set/delete
- list operations for queue-like behavior
- `mGet`, `lRange`, `lRem`, etc.

All values are JSON-encoded before storage.

### `jwt.php`

Provides `JWTH`:

- RS256 signing with private key from config
- RS256 verification with public key from config
- bearer token extraction from `Authorization`
- validation of:
  - token type via `typ`
  - issuer via `iss == SERVER_HOST`
  - `sub`
  - `sid`
  - consistency of `uid_by_sess:<sid>` and `sess_by_uid:<uid>`

### `api_exceptions.php`

Defines:

- `ApiException`
- `JwtException`
- `AuthException`
- `SendException`
- `TooManyRequests`

## 4.3 Service layer

Location: `web-app/app/service.php`

Responsibilities:

- create access and refresh JWTs
- enqueue messages
- list inbound messages for a UID
- clear individual messages
- clear all server-side state for a UID

Redis server-side model:

- `msg:<message_id>` -> raw message object
- `messages_to_uid:<uid>` -> list of inbound message IDs
- `messages_from_uid:<uid>` -> list of outbound message IDs
- `sess_by_uid:<uid>` -> current session id
- `uid_by_sess:<sid>` -> uid for session id

Current clear semantics:

- reading a message from the server and marking it read deletes the server copy
- server message storage is transient transport storage, not an archive

### Detailed Redis data model

Redis is used as a transient operational store, not as a relational or document database.

All values written through `Storage` are JSON-encoded, including scalar values.

Key families:

- `sess_by_uid:<uid>`
  - type: string
  - payload: current session id for this UID
  - written by:
    - `/api/auth`
    - `/api/refresh`
  - read by:
    - `JWTH::check(...)`
    - `clear_uid($uid)`
  - deleted by:
    - `clear_uid($uid)`
  - TTL:
    - `UID_EXPIRE_SECONDS`
  - notes:
    - canonical “current session for UID” mapping

- `uid_by_sess:<sid>`
  - type: string
  - payload: UID owning this session id
  - written by:
    - `/api/auth`
    - `/api/refresh`
  - read by:
    - `JWTH::check(...)`
  - deleted by:
    - `clear_uid($uid)`
  - TTL:
    - `UID_EXPIRE_SECONDS`
  - notes:
    - reverse lookup for session validation

- `msg:<message_id>`
  - type: string
  - payload:
    - `id`
    - `from`
    - `to`
    - `payload`
  - written by:
    - `add_message($sender, $receiver, $payload)`
  - read by:
    - `/api/receive`
  - deleted by:
    - `clear_message($uid, $msg_id)`
    - `clear_uid($uid)`
  - TTL:
    - `MSG_EXPIRE_SECONDS`
  - notes:
    - top-level transport object for one message
    - payload may be encrypted string or plain JSON object

- `messages_to_uid:<uid>`
  - type: Redis list
  - payload: ordered list of message ids addressed to this UID
  - written by:
    - `LPUSH` on every send
  - read by:
    - `get_messages_list($uid)`
    - `/api/receive-list`
    - `clear_message($uid, $msg_id)` during cleanup
  - deleted by:
    - `LREM` in `clear_message`
    - whole key deleted by `clear_uid`
  - TTL:
    - none explicitly set on the list itself
  - notes:
    - represents server-side inbound queue membership for a UID

- `messages_from_uid:<uid>`
  - type: Redis list
  - payload: ordered list of message ids sent by this UID
  - written by:
    - `LPUSH` on every send
  - read by:
    - `clear_message($uid, $msg_id)` during cleanup
  - deleted by:
    - `LREM` in `clear_message`
    - whole key deleted by `clear_uid`
  - TTL:
    - none explicitly set on the list itself
  - notes:
    - currently used mainly for cleanup symmetry and sender ownership bookkeeping

- `last_request_mtime:<uid>:<route>`
  - type: string
  - payload: last request timestamp for throttled route
  - written by:
    - `Router::throttle(...)`
  - read by:
    - `Router::throttle(...)`
  - deleted by:
    - implicit expiry only
  - TTL:
    - short-lived, derived from throttle interval
  - notes:
    - used for rate limiting `/api/send` and `/api/send-multi`

Relational interpretation of the Redis model:

- one UID has exactly one active session id in Redis at a time
- one session id maps back to exactly one UID
- one message belongs to exactly one sender UID and one receiver UID
- inbound message membership for a user is materialized by inclusion in `messages_to_uid:<uid>`
- outbound message membership for a user is materialized by inclusion in `messages_from_uid:<uid>`

Operational semantics:

- Redis is the transport queue and session registry
- browser storage is the durable client-side working set
- the server does not maintain a permanent inbox after successful client fetch + read
- list entries may temporarily outlive the referenced `msg:<id>` object if the message TTL expires first
- the system tolerates this because `/api/receive` may return `null` entries for missing messages

## 4.4 Route map

Location: `web-app/app/controller.php`

### Server-rendered pages

- `/`
  - renders `_tabs_content` with all tab contents present in DOM
- `/about`
- `/security`
- `/clipboard`
- `/share-key`
- `/add-key`

The root page is effectively a tabbed SPA shell rendered server-side.

### Runtime assets and config

- `/js/translations/languages.js`
  - emits `window.TR_LANGUAGES`
- `/js/env.js`
  - emits `window.APP_CONF` from safe frontend config values
- `/api/icons`
  - renders icon page template

### Auth/session routes

- `/api/auth`
  - creates a new anonymous UID + session id
  - stores Redis mappings
  - returns access and refresh tokens
- `/api/check`
  - validates bearer access token
  - returns `{check:"ok", uid}`
- `/api/refresh`
  - validates refresh token
  - refreshes Redis session TTLs
  - returns new access and refresh tokens
- `/api/clear`
  - validates access token
  - deletes all server-side state for current UID

### Messaging routes

- `/api/send`
  - send one payload to one receiver
  - validates receiver session existence
  - throttled
- `/api/send-multi`
  - send many payloads to many receivers in one request
  - throttled
  - returns either message IDs or per-receiver error descriptors
- `/api/receive-list`
  - validates access token
  - returns inbound message IDs for current UID
- `/api/receive`
  - validates access token
  - returns message objects for requested IDs
  - rejects access if any returned message does not belong to current UID as sender or receiver
- `/api/read`
  - validates access token
  - clears given message IDs if they belong to sender or receiver

### Legacy/ancillary routes

- `/api/uid`
  - creates a PHP-session UID if missing
  - not used by current frontend runtime
- `/api/jwt-pub-key`
  - returns configured JWT public key
  - not used by current frontend runtime

## 4.5 Localization on the backend

Language selection logic:

- cookie `lang` has highest priority
- then `Accept-Language`
- then fallback to `en-us`
- language code normalization uses lowercase and `-` separators
- short-language fallback is supported, e.g. `ru` -> `ru-ru`

About/security content is loaded from markdown files under:

- `web-app/text/en_us`
- `web-app/text/ru_ru`
- `web-app/text/zh_cn`

If a localized markdown file is missing, English fallback is used.

## 5. Frontend Specification

Frontend design principle:

- the frontend is intentionally shipped as directly readable source, not as a compiled/minified application bundle
- the code is intentionally written without a modern frontend framework
- this is done to make the client easier to inspect for security purposes
- the code should remain readable even for contributors who are not frontend specialists
- the practical goal is that message flow, crypto flow, storage, and UI behavior can be audited from source with minimal tooling and minimal framework-specific knowledge

## 5.1 Boot sequence

Main runtime: `web-app/public/js/frontend.js`

Boot flow:

1. `default.php` preloads translation metadata and the active dictionary synchronously before app scripts.
2. `shared.js` defines i18n, broadcast, locking, and helpers.
3. `frontend.js` defines the global `lib` object.
4. On DOM ready:
   - `i18n.translate_dom()` localizes SSR placeholders
   - `lib.core.init()` starts application boot

`lib.core.init()` does the following:

- initializes browser broadcast channel
- installs default broadcast listeners
- initializes language UI
- shows initial message loader
- initializes sound subsystem
- registers service worker
- obtains or generates crypto keys
- acquires cross-tab lock for initial auth check
- checks/refreshes/authenticates server tokens
- updates init popover states
- ensures the current user exists in receiver list as “Myself”
- initializes tab routing
- renders share-key screen content
- starts:
  - message polling interval
  - auth refresh interval
  - file send queue processor
- redraws receivers
- checks app version mismatch and offers reset

## 5.2 DOM and navigation model

The app is hybrid SSR + client-side tab navigation:

- `_tabs_content.php` renders all main tab bodies into the page at once
- `lib.tabs.change_tab()` only toggles visibility via CSS classes
- navbar clicks on internal links call `history.pushState()` and switch tabs client-side
- direct URL hits still work via server-side route rendering

Main tabs:

- `share-key`
- `clipboard`
- `add-key`
- `about`
- `security`

## 5.3 Browser persistence model

Two persistence layers are used:

- `localStorage`
  - synchronous access
  - mostly for small frequently-read items
- `localforage`
  - async storage
  - used for messages, blobs, receivers, tokens, queues, and larger data

Both layers wrap values in:

- `data`
- `expire`

Expiry values:

- integer Unix timestamp
- or `"never"`

Frontend TTL behavior:

- default TTL comes from `FRONTEND_TTL_SECONDS`
- if `FRONTEND_NO_EXPIRE=true`, default writes become non-expiring
- specific writes may also pass `false` to force non-expiring persistence

## 5.4 Cross-tab coordination

Implemented in `shared.js` and used throughout frontend.

### Broadcast layer

`BroadcastMessanger` uses:

- native `BroadcastChannel` when available
- `BroadcastChannel2` polyfill fallback

Broadcast events used by the app include:

- `give_me_private_key`
- `take_private_key`
- `kill_session`
- `uid_changed`
- `keys_regenerated`
- `messages_changed`
- `reload_page`
- `incoming_sound_setting_changed`
- service-worker ping traffic

### IndexedDB lock layer

`Locker` is an IndexedDB-backed mutex.

It is used for:

- initial auth lock
- serialized message polling/drawing
- sound playback de-duplication across tabs
- file send queue processing

### Additional lock implementation

`InterTabLock` also exists in `shared.js`, but the current frontend does not instantiate or use it.

## 5.5 Authentication and identity in the browser

### Session model

- server issues JWT access and refresh tokens
- browser stores them in `localforage`
- access token is attached to AJAX requests as `Authorization: Bearer <token>`

### Auth lifecycle

`lib.ajax.check_refresh_auth()`:

1. tries `/api/check`
2. if JWT invalid, tries `/api/refresh`
3. if refresh also fails with JWT error, falls back to `/api/auth`

### UID handling

`lib.client.set_uid(uid)`:

- stores current UID in browser storage
- detects UID changes
- if UID changed:
  - shows modal
  - clears receiver list
  - broadcasts `uid_changed`
  - re-adds self receiver

### Kill session

`lib.client.kill_session()`:

- calls `/api/clear` best-effort
- clears `localforage`
- clears `localStorage`
- resets in-memory UID and keys
- broadcasts `kill_session`
- reloads the page

This reset also clears sound settings and all locally cached message/file state.

## 5.6 Cryptography model

### Key model

- RSA keypair generated client-side with JSEncrypt
- default key size: 1024 bits
- keys stored in `localStorage`
- keys have frontend TTL
- if private key is missing but public key exists, a tab may request the private key from another tab

Rationale for 1024-bit default:

- the current key size is an explicit UX/performance tradeoff
- in-browser generation of 2048-bit RSA keys is considered too slow for the current initialization flow
- 1024 bits was therefore chosen to keep first-load experience acceptable on typical client devices

Planned future improvement:

- the project is expected to support user-supplied key pairs in addition to browser-generated ones
- the intended use case is importing an externally generated RSA key pair, for example created with `ssh-keygen`
- this would allow advanced users to choose stronger key parameters without forcing slow in-browser generation on everyone

### Payload encryption

When receiver has a public key:

1. generate random AES key and IV
2. encrypt key+IV with receiver RSA public key
3. encode plaintext JSON as base64
4. encrypt base64 payload with AES-CBC
5. package as:
   - `rsa::<rsa_encrypted>::aes::<aes_encrypted>::end`

When receiver has no public key:

- payload is sent as plain JSON object
- UI explicitly warns before enabling unprotected send

### Decryption

- encrypted payloads are decrypted with receiver’s private key in browser
- malformed payloads become message state `broken`

### Avatar derivation

Avatars are deterministic and derived from:

- UID
- normalized shared-format public key

This is used as a lightweight human-verification aid when exchanging keys.

Practical meaning:

- if the same `uid + public_key` pair is entered on different devices, the avatar should match
- if the avatar does not match, the user should assume that either the UID or the public key changed in transit
- the avatar is therefore intended as a simple visual integrity check, not as a cryptographic verification protocol

## 5.7 Receiver/contact model

Receivers are entirely client-side.

Stored structures:

- `all_receivers`
  - object map of known UIDs
- `receiver:<uid>`
  - receiver object

Receiver fields:

- `uid`
- `name`
- `public_key`
- `public_key_valid`
- `data`
  - `avatar_number`
  - `icon`
  - `send`
  - optional `is_self`

Behavior:

- “Myself” is auto-added after boot
- adding a receiver stores name/key locally only
- `send` flag controls whether outbound broadcasts go to that receiver
- receivers without a public key can still be enabled for sending, but only after warning
- incoming `add` messages can auto-create or update receiver knowledge

## 5.8 Message model

### Local message persistence

Per-user message list:

- `msgs:<uid>` -> ordered array of locally stored message IDs

Per message:

- `msg:<message_id>` -> parsed/normalized message object

Read markers for polling:

- `uid:<uid>:msg_id:<message_id>` -> indicates that this message ID was already fetched and locally stored

### Server message lifecycle

1. sender pushes message to server
2. receiver polls `/api/receive-list`
3. receiver fetches missing messages via `/api/receive`
4. receiver parses and stores locally
5. receiver marks them read via `/api/read`
6. server deletes them

Implication:

- the browser, not the server, is the durable message history owner

### Message shape

Server-side raw message:

- `id`
- `from`
- `to`
- `payload`

Client-side parsed message adds:

- `type`
- `state`
- `incoming`
- `need_processing`
- `hidden`
- `data`

### Message states

- `encrypted`
- `unencrypted`
- `broken`

### Message types currently implemented

- `text`
  - plain text payload
- `file`
  - file metadata envelope
  - requires follow-up `file_part` messages
- `file_part`
  - hidden internal chunk messages
- `add`
  - share receiver UID + public key
- `test`
  - debug/test message type
- `unknown`
  - fallback for unsupported types
- `image`
  - placeholder parser only, not part of main file flow
- `audio`
  - placeholder parser only, not part of main file flow

Important note:

- image and audio transfers are currently represented by `type:"file"` with metadata flags like `is_image`, not by dedicated `image`/`audio` message types

## 5.9 File transfer protocol

All file logic lives in `lib.files`.

### Constraints

- max size: 10 MiB
- part size: 200 KiB

### Sender-side flow

1. user selects or drops files
2. UI opens modal for per-file selection and optional comment
3. browser reads file as Data URL via `FileReader`
4. SHA-256 of full Data URL string is computed
5. browser builds:
   - one `file` metadata message
   - N `file_part` messages
6. packages are persisted to local queue storage
7. background queue processor sends them one by one using `send_raw`

Sender-side local queue keys:

- `current_sending_files`
- `sending_file:<file_id>`
- `send_file:<file_id>:part_num:<n>`

### Receiver-side flow

1. `file` message arrives first or independently
2. parsed file metadata is stored in local message object
3. `file_part` messages store chunk payloads as blobs in `localforage`
4. `update_file_parts(file_id)` recalculates progress and marks file as loaded when all parts arrived
5. `reconstruct_file_from_parts(file_msg_id)` concatenates parts and verifies SHA-256
6. if hash matches:
   - stores full content under `blob:file_msg_id:<message_id>`
   - deletes chunk artifacts
7. if hash does not match:
   - marks file corrupted
   - deletes chunk artifacts

Receiver-side storage keys:

- `file:<file_id>:msg` -> maps transport file id to top-level message id
- `file:<file_id>:parts_msg_ids` -> localStorage map from chunk number to message id
- `blob:file_id:<file_id>:part_num:<n>` -> received chunk contents
- `blob:file_msg_id:<message_id>` -> reconstructed full file contents

### Rendering strategy for images

Current image behavior:

- image files are still represented as `type:"file"`
- when fully loaded, UI first renders them as normal downloadable files
- in parallel, preview data is fetched from `blob:file_msg_id:<message_id>`
- once cached, the message is redrawn as an inline image preview

This design avoids blocking initial history rendering on blob reads.

## 5.10 Message polling and redraw strategy

Message polling is driven by `lib.msg.auto_checker_msg`, an `IntervalCaller`.

Current polling behavior:

- every `receive_interval_ms`, one tab acquires `check_new_and_draw` lock
- calls `check_new()`
- then redraws the UI

`check_new()` details:

- fetches all current server message IDs
- filters out IDs already known via `uid:<uid>:msg_id:<id>`
- processes only the first 10 unread IDs per cycle
- fetches full messages
- parses and stores them locally
- triggers post-save hooks such as file progress updates
- adds IDs to local message list
- marks them read on the server

Important implementation note:

- `FRONTEND_POLL_RECEIVE_LIST_MS` is exported via `/js/env.js`, but the current frontend does not use a separate receive-list interval; the effective polling loop uses `FRONTEND_POLL_RECEIVE_MS`

## 5.11 UI rendering model

### Message rendering

`lib.ui.draw.get_single_message_code(msg)` builds HTML for a message based on:

- message type renderer
- encryption state icon
- processing icon
- avatar of sender
- incoming/outgoing class

### Redraw behavior

- HTML output per message is cached in `lib.ui.html_blocks_cache`
- redraw only happens if rendered HTML differs
- existing DOM node is replaced in place where possible
- newly unseen messages are prepended to `.messages`

### Initial loader

On the first local history draw:

- `.messages` is temporarily hidden
- a loader with localized “Loading messages...” text is shown
- the loader is hidden after the first `draw.messages()` resolves, even if there are zero messages

### Copy affordances

- clicking on `.copyable-block` text shows a floating copy button
- `Ctrl+C` copies current selection if any
- if nothing is selected and copy helper is visible, the helper copies the target message block

## 5.12 Sound notifications

`lib.sound` manages sound settings and playback.

Current capabilities:

- enabled/disabled toggle in navbar
- persisted via `localforage`
- synchronized between tabs via broadcast
- currently one registered sound type:
  - `message` -> `/sound/message.mp3`
- API already supports future expansion:
  - `audio_urls`
  - `play(type)`

Notification rules:

- non-file incoming messages: sound on first display
- file messages: sound only when file becomes fully loaded and UI updates to loaded state
- cross-tab deduplication is enforced with a `Locker`
- per-message “already notified” marker is persisted in `localforage`

## 5.13 Internationalization

Translation system consists of:

- `window.TR_LANGUAGES`
- per-locale dictionaries in `web-app/public/js/translations/*.js`
- SSR placeholders in `{Key}` form
- runtime `tr()` helper
- `i18n.translate_dom()` which replaces placeholders in text nodes and selected attributes

Supported languages:

- `en-us`
- `ru-ru`
- `zh-cn`

Language choice persistence:

- client storage key `language`
- cookie `lang`

Page shell chooses locale before app boot using a synchronous preloader in `default.php`.

## 5.14 Service worker

File: `web-app/public/js/sw.js`

Current behavior:

- registers service worker
- imports `shared.js`
- creates a broadcast channel
- starts a 1-second interval that emits `sw.ping`

Current limitations:

- no cache storage strategy
- no fetch interception
- no offline mode
- no push notification logic

It currently functions as lightweight infrastructure/experiment rather than a classical PWA cache worker.

## 6. Templates and UI Structure

Main templates:

- `_menu.php`
  - top navbar
  - tab links
  - language selector
  - sound toggle
  - kill-session button
- `_popover.php`
  - startup status overlay
- `share-key.php`
  - user avatar
  - UID display
  - QR code target
  - share link
- `clipboard.php`
  - message list
  - initial message loader
  - send textarea
  - file send controls
  - receiver panel
- `add-key.php`
  - manual/key-share link receiver import form
- `about.php`, `security.php`
  - markdown-rendered informational pages

## 7. Configuration Specification

## 7.1 Backend `.env` values

Core variables:

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_DB`
- `JWT_PUBLIC_KEY`
- `JWT_PRIVATE_KEY`
- `SERVER_HOST`
- `JWT_EXPIRE_SECONDS`
- `JWT_REFRESH_EXPIRE_SECONDS`
- `UID_EXPIRE_SECONDS`
- `MSG_EXPIRE_SECONDS`
- `SENTRY_DSN`
- `PHP_DEBUG`
- `JS_DEBUG`

## 7.2 Frontend runtime config exported via `/js/env.js`

Safe public config:

- `FRONTEND_POLL_RECEIVE_LIST_MS`
- `FRONTEND_POLL_RECEIVE_MS`
- `FRONTEND_POLL_REFRESH_AUTH_MS`
- `FRONTEND_NO_EXPIRE`
- `FRONTEND_TTL_SECONDS`
- `FRONTEND_AJAX_DEBUG`
- `FRONTEND_MESSAGES_DEBUG`
- `FRONTEND_FILES_DEBUG`
- `FRONTEND_SOUND_DEBUG`

Exposed in browser as:

- `window.APP_CONF.polling.*`
- `window.APP_CONF.storage.*`
- `window.APP_CONF.debug.*`

Current implementation notes:

- `debug.sound` is consumed
- `debug.js` is exported but not meaningfully consumed by `frontend.js`

## 8. Deployment Model

## 8.1 Docker deployment

Composition:

- `cryptboard-webapp`
  - PHP 7.4 FPM
  - composer dependencies
  - Redis extension
- `redis`
- `nginx`

Relevant files:

- `docker/docker-compose.yml`
- `docker/Dockerfile-webapp`
- `docker/Dockerfile-nginx`

## 8.2 Dockerless deployment

Expected stack:

- nginx
- php-fpm
- redis

Reference configs:

- `conf/nginx/dockerless.conf`
- `conf/nginx/docker-proxypass.conf`

## 9. Data and Storage Inventory

## 9.1 Server-side Redis keys

- `sess_by_uid:<uid>`
- `uid_by_sess:<sid>`
- `msg:<message_id>`
- `messages_to_uid:<uid>`
- `messages_from_uid:<uid>`
- `last_request_mtime:<uid>:<route>`

## 9.2 Browser storage keys

General:

- `uid`
- `access_token`
- `refresh_token`
- `private_key`
- `public_key`
- `keys_expire`
- `language`
- `lib_version`

Receivers:

- `all_receivers`
- `receiver:<uid>`

Messages:

- `msgs:<uid>`
- `msg:<message_id>`
- `uid:<uid>:msg_id:<message_id>`

Files:

- `file:<file_id>:msg`
- `file:<file_id>:parts_msg_ids`
- `blob:file_id:<file_id>:part_num:<n>`
- `blob:file_msg_id:<message_id>`
- `send_file:<file_id>:part_num:<n>`
- `sending_file:<file_id>`
- `current_sending_files`

Sound:

- `incoming_message_sound_enabled`
- `incoming_message_displayed:<message_id>`

## 10. Security Model and Tradeoffs

## 10.1 Intended security properties

- server cannot decrypt encrypted payloads without recipient private key
- receivers are identified by UID + public key
- avatar determinism helps detect key substitution manually
- private keys stay browser-side
- sessions are stateless at token level but bound to Redis session mappings

## 10.2 Explicit tradeoffs in current implementation

- unencrypted sending is allowed if receiver has no public key and user enables it
- server stores encrypted blobs and metadata temporarily until read
- key verification is human-assisted, not protocol-enforced
- RSA key size is only 1024 bits in current implementation
- message retrieval route `/api/receive` currently lacks bearer-auth validation
- frontend keeps private key in browser storage for usability

## 10.3 Operational caveats

- server message storage is transient and destructive-on-read
- clearing session removes local history and keys
- browser storage is the effective source of history truth

## 11. Extension Points

The codebase is structured to allow incremental growth in these areas:

- additional sound types through `lib.sound.audio_urls` and `lib.sound.play(type)`
- richer message types via `lib.ui.msg.types`
- richer receiver metadata
- more frontend debug flags through `/js/env.js`
- stronger service-worker behavior
- improved auth-hardening and route protection

## 12. Current Implementation Gaps and Legacy Artifacts

These are not theoretical concerns; they reflect the current code:

- `InterTabLock` exists but is not used by the active frontend
- `/api/uid` and `/api/jwt-pub-key` are present but not used by the current app flow
- `FRONTEND_POLL_RECEIVE_LIST_MS` is exported but not consumed by polling logic
- `window.APP_CONF.debug.js` is exported but not actively used
- `image` and `audio` message types exist mostly as placeholders; real media transfer uses `type:"file"`
- service worker emits pings but does not provide offline asset caching
- there is no test harness documenting expected flows at code level

## 13. Recommended Mental Model for Contributors

When changing the system, treat it as:

- a very thin transport/auth backend
- a thick browser client with its own durable working set
- a transient server queue rather than a database-backed messaging system
- a tab-coordinated app where multiple browser contexts may act on the same local state

The safest way to reason about new features is:

1. decide whether state belongs on the server or only in browser storage
2. decide whether it must survive tab reloads and kill-session
3. decide whether it must be synchronized across tabs
4. define whether it should be protected by encryption, auth, or both
5. map the feature onto the existing message/file/receiver/runtime config primitives
