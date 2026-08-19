# JavaScript architecture

- `app.js` — single browser entrypoint.
- `core/` — bootstrap, routing primitives, global events, state and compatibility adapters.
- `components/` — UI components and page renderers grouped by domain.
- `services/` — API clients, catalog logic, Firebase and caching services.
- `config/` — constants, environment and Firebase configuration.
- `utils/` — small stateless helpers.
- `legacy/` — temporary orchestration compatibility layer only. New domain code must not be added here.

`core/compat/` contains the current Auth, Router and Storage adapters that still depend on the legacy runtime. They are kept separate from the new core primitives until the remaining orchestration code is migrated.
