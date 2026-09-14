# Lumen Ops build-week guide

`Lumen-Ops-Build-Week 1.pdf` is a five-day training brief for rebuilding the important patterns of a municipal street-lighting operations application. The objective is not a production clone; it is a small, runnable codebase that makes the architecture of a larger Angular application familiar.

## The domain

Luminaires are geo-located assets with lamp types, wattages and statuses. A council reports faults, those faults become work orders, and contractor crews complete them. The same application serves council and contractor users, so routes and actions must vary by role. Every luminaire also emits energy readings used by the dashboard.

## Required technical baseline

The brief specifies Angular 19.2 with standalone SCSS components, Bootstrap 5, hash routing, component input binding and preloading. It deliberately uses `strict: false` with `strictTemplates: true`, and asks for `@core`, `@shared` and `@business` import aliases. The local mock API must return the shared pagination envelope and include artificial latency so race conditions are observable.

## Day-by-day map

| Day | Focus | Main deliverables |
| --- | --- | --- |
| 1 | Skeleton, contract, shell | Workspace configuration, Express mock API, persistent layout and lazy routes |
| 2 | Authentication and authorization | Session bootstrap, JWT decoder, HTTP interceptors, guards and role-aware directives |
| 3 | Data layer and table pattern | Typed collection service, filter DSL and reusable RxJS paginated table |
| 4 | Signals, forms, i18n and accessibility | Signal-based table alternative, fault form, modal/dirty-exit guard, translations and keyboard access |
| 5 | Maps, charts and delivery | OpenLayers map, energy charts, tests, Docker/CI and deployment documentation |

## Implementation sequencing

Each exercise should leave the application running and should be committed independently. The mock API, shell, auth and first data table create the foundation for later work. The generic table is intentionally built before feature screens so search, sort, pagination, loading and error states are solved once. A signal-based version follows later so its differences from the RxJS base class can be compared directly.

## Definition of done

The completed training app should start with one command for the mock API and one for Angular, route users to role-appropriate home pages, paginate and sort real seeded data, prevent stale table results under latency, handle dirty forms safely, switch Spanish/English strings, synchronize map/table selection, render energy charts, and provide tests plus delivery assets.

## What is already scaffolded

The current workspace contains the Day 1 foundation and the beginning of Days 2–3: Angular configuration, Bootstrap/SCSS conventions, the mock API, shell/lazy routes, session/auth plumbing, role guards, and the shared pagination/table foundation. The remaining exercises can now be implemented on top of those contracts.
