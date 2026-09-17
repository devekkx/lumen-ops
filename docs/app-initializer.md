# The app initializer, and the failure I went looking for

`provideAppInitializer(() => inject(AuthService).initializeUser())` is what I
use to make the first route resolve against a known session. If I get this
wrong, it produces a bug that is very hard to read backwards from the
symptom, so let me tell you plainly what that symptom actually looks like.

## What a rejecting initializer does

If `initializeUser()` rejects, Angular's bootstrap never completes. The
result is not an error page and not the login screen - it is a **blank
document**. `<app-root>` stays empty, the router never runs, so no guard
fires and nothing redirects. The console carries the rejection and the page
carries nothing.

That, to me, is the real trap: the visible symptom ("the app is white")
points at rendering, while the cause is one rejected promise in a provider
that ran before any component existed.

It is also, I dare say, the worst possible failure for this particular path,
because the most likely reason to reject is *an expired token* - that is,
the perfectly ordinary case of coming back the next morning. A user whose
session simply timed out would get a white screen instead of a login form,
and that is not something I am prepared to ship.

### An honest note on how I observed this

I did not watch it in a browser - I have no working browser in this
environment (`ng test` cannot run here either; see the PR). What I have
verified is the *code path*, in `auth.service.spec.ts`:

- `initializeUser()` resolves rather than rejecting for an expired token
- …and for a malformed one
- …and when `localStorage` itself throws
- `booting()` is `false` afterwards in every one of those cases

Those assertions are what actually hold the behaviour in place for me. The
description of the blank page above is the documented Angular bootstrap
contract, not something I personally watched happen and am reporting as
observation.

## The fix

I needed three parts, and all three are necessary:

1. **`initializeUser()` never rejects.** It catches, records *why* in a
   `failure` signal, and resolves. Bootstrap always completes.
2. **The bad token is discarded.** Otherwise the next reload fails
   identically and the user is stuck in a loop with no way to clear it from
   the UI.
3. **A `booting` signal gates the shell.** `AppComponent` renders a splash
   while `booting()` is true and the `<router-outlet>` only after.

Part 3 fixes a second, subtler bug I found along the way. Without the
splash, a reload on a deep route renders for one frame *before* the session
is known - the guards see no user, the login screen flashes, and then the
route resolves and it disappears. To a user, it reads as being logged out at
random. The brief's "reloading on a deep route keeps you logged in and does
not flash the login screen" is exactly that frame.

## Distinguishing the two failures

I keep `MALFORMED` and `EXPIRED` apart on purpose:

- **`EXPIRED`** → "Your session expired. Sign in again." A true statement
  the user can act on.
- **`MALFORMED`** → "Session could not be resolved." The stored value is
  junk; telling the user their session expired would be a guess on my part,
  and I would rather not guess at someone.

A first-time visitor with no token gets **neither**. They had nothing to
resolve, and showing "your session expired" to someone who never had one is,
as far as I'm concerned, worse than silence.

## Why I decode the token by hand

`jwt.ts` is eight lines of base64url decode rather than a dependency,
because knowing what is actually inside a token is the whole point of this
exercise for me.

One detail earns its place: `atob` returns *bytes*, so I percent-encode the
payload and run it back through `decodeURIComponent`. Without that,
`Área de Obras y Equipamientos` decodes to mojibake - and every seeded user
in this app has an accented organisation name. I have a spec for it, so this
one is not just a claim I am making.
