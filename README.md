# Lumen Ops

Angular 19.2 training workspace for a municipal street-lighting operations app. It uses standalone components, SCSS, Bootstrap 5, hash routing, lazy feature boundaries, and a local Express mock API.

## Run

Install dependencies with `npm install`. In one terminal run `npm run mock-api`; in another run `npm start`. Open `http://localhost:4200/#/luminarias`.

## Layout

- `src/app/core`: auth, guards, interceptors and application-wide services.
- `src/app/shared`: reusable table, form, translation and utility primitives.
- `src/app/business`: generated/domain-specific features (reserved for later exercises).
- `src/app/features`: lazy feature entry points.
- `mock-api`: the paginated REST and auth contract used throughout the build week.

## Architectural decisions

The API uses a page envelope (`data`, `currentPage`, `lastPage`, `total`, `perPage`) so every collection screen shares one contract. The shell is persistent and the feature pages are lazy-loaded so navigation chrome does not remount. Hash routing is deliberate: it avoids requiring server rewrites in the target deployment setup.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.19.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
