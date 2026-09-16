# Lumen Ops build-week guide

`Lumen-Ops-Build-Week 1.pdf` is my five-day training brief for rebuilding the
important patterns of a municipal street-lighting operations application. My
objective here is not a production clone; it is a small, runnable codebase
that makes the architecture of a larger Angular application feel familiar to
me, and to anyone who picks this up after me.

## The domain

Luminaires are geo-located assets with lamp types, wattages and statuses. A
council reports faults, those faults become work orders, and contractor
crews complete them. I built one application to serve both council and
contractor users, so routes and actions have to vary by role. Every
luminaire also emits energy readings that I use on the dashboard.

## Required technical baseline

The brief asks me for Angular 19.2 with standalone SCSS components,
Bootstrap 5, hash routing, component input binding and preloading. It
deliberately uses `strict: false` with `strictTemplates: true`, and asks for
`@core`, `@shared` and `@business` import aliases. My local mock API must
return the shared pagination envelope and include artificial latency so I
can actually observe race conditions rather than just assume them away.

## Day-by-day map

| Day | Focus | Main deliverables |
| --- | --- | --- |
| 1 | Skeleton, contract, shell | Workspace configuration, Express mock API, persistent layout and lazy routes |
| 2 | Authentication and authorization | Session bootstrap, JWT decoder, HTTP interceptors, guards and role-aware directives |
| 3 | Data layer and table pattern | Typed collection service, filter DSL and reusable RxJS paginated table |
| 4 | Signals, forms, i18n and accessibility | Signal-based table alternative, fault form, modal/dirty-exit guard, translations and keyboard access |
| 5 | Maps, charts and delivery | OpenLayers map, energy charts, tests, Docker/CI and deployment documentation |

## Implementation sequencing

I try to leave the application running after each exercise, and to commit
each one independently. The mock API, shell, auth and first data table are
the foundation everything after them sits on. I built the generic table
before any feature screen on purpose, so search, sort, pagination, loading
and error states get solved once rather than five times. A signal-based
version follows later so I - and whoever reads this after me - can compare
its differences from the RxJS base class directly, side by side.

## Definition of done

By the time I call this training app done, it should start with one command
for the mock API and one for Angular, route users to role-appropriate home
pages, paginate and sort real seeded data, prevent stale table results under
latency, handle dirty forms safely, switch Spanish/English strings,
synchronize map/table selection, render energy charts, and carry tests plus
delivery assets. That is my bar, small small, day by day.

## What is already scaffolded

Right now, this workspace holds the Day 1 foundation and the beginning of
Days 2-3: Angular configuration, Bootstrap/SCSS conventions, the mock API,
shell/lazy routes, session/auth plumbing, role guards, and the shared
pagination/table foundation. The remaining exercises can go on top of those
contracts from here.
