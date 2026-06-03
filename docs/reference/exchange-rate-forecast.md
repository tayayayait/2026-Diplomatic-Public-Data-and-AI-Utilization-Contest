# Exchange Rate Forecast Reference

Last reviewed: 2026-06-01

## Scope

`/cost` includes an exchange-rate timing panel for reference-only currency conversion planning.

The user selects:

- base currency
- target currency

The planned exchange amount is entered only in the simulation modal, not in the main chart panel.

The panel shows:

- current effective rate
- recent historical rate trend
- next 7-day backtested forecast
- best forecast date by rate
- a simulation modal comparing today, 1 day, 3 days, and 7 days for a user-entered amount

Refresh timing is based on the selected travel country/city, not the user's browser time zone.
For example, a Japan selection uses `Asia/Tokyo`; when the local date changes in Japan, the
historical series and forecast are recalculated.

## Data Source

Historical and latest rates are fetched through `fxapi.app` first:

Latest pair endpoint:

`https://fxapi.app/api/{base}/{target}.json`

Historical range endpoint:

`https://fxapi.app/api/history/{base}/{target}.json?from={YYYY-MM-DD}&to={YYYY-MM-DD}`

`fxapi.app` is used because it exposes keyless JSON endpoints and currently publishes updated
rates at a shorter interval than the previous daily CDN source.

If `fxapi.app` fails, the app falls back to the free `fawazahmed0/currency-api` CDN endpoint:

`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date}/v1/currencies/{base}.json`

The secondary fallback endpoint is:

`https://{date}.currency-api.pages.dev/v1/currencies/{base}.json`

For the fallback source, `date` is either `latest` or `YYYY-MM-DD`.

## Cache

Historical series are cached server-side in memory by:

`exchange-rate-history:{BASE}:{TARGET}:{DAYS}:{TIME_ZONE}:{LOCAL_DATE}`

Default settings:

- history window: 30 days
- forecast window: 7 days
- cache freshness: 10 minutes and the selected-destination local calendar day

The cache stores normalized historical points, source, and `cachedAt`. Entries from a previous
destination-local date, entries older than the short cache TTL, or malformed entries are ignored.

The `/cost` client also stores the rendered forecast result in local storage by:

`exchange-rate-forecast-client:{BASE}:{TARGET}:{DAYS}:{TIME_ZONE}:{LOCAL_DATE}`

Route re-entry or browser refresh reuses this result only while it is inside the short cache TTL and
the same destination-local calendar day. At the next local midnight, the client refresh date changes,
the query key changes, and the panel requests a newly calculated historical series and forecast. The
client cache is injected only after React hydration so the first server-rendered and client-rendered
trees remain identical.

## Forecast Model

The current model is deterministic and dependency-free. It is designed to improve on the earlier simple drift forecast while keeping the user-facing result simple.

1. Sort positive historical daily rates by date.
2. Convert rate levels into log returns.
3. Generate candidate forecasts for each horizon using:
   - random-walk / no-change baseline
   - EWMA log-return drift
   - short-window momentum
   - mean reversion toward the recent log-rate average
4. Backtest each candidate on the available historical window for the same forecast horizon.
5. Convert recent candidate errors into inverse-error weights.
6. Combine candidate forecasts in log-rate space.
7. Attach an internal error band to each forecast point.

The UI does not expose model weights or formula details. It translates the forecast into expected gain/loss for the user-entered amount. Prophet, GARCH, XGBoost, or graph/deep-learning models remain later replacement options if longer historical storage and validation data justify them.

The chart bridges the forecast series from the latest actual historical point, so the dashed
prediction line starts from the current actual rate instead of appearing as a disconnected fixed
segment.

The source may still publish the latest available rate later than the destination's local midnight or
temporarily fail. When that happens, the UI labels the value as the latest actual rate and states
that today's actual rate is not yet available. The forecast can therefore start on the current
destination-local date while the latest actual point remains on the previous date.

## Exchange Simulation

The simulation modal uses the current actual rate as the baseline and compares forecast checkpoints:

- today
- 1 day after the latest actual rate
- 3 days after the latest actual rate
- 7 days after the latest actual rate

For each checkpoint, the app calculates:

- expected rate
- expected target-currency amount
- difference from exchanging today
- judgment label: baseline, same, slightly favorable, favorable, slightly unfavorable, unfavorable

Rows with the highest expected target-currency amount in the comparison table are highlighted.

The modal intentionally keeps the result money-focused. Users see how much more or less target currency they may receive, not the model internals.

## Financial Disclaimer

The UI must state that forecast output is based on historical backtesting and is not definitive financial advice. The feature must not phrase the result as guaranteed profit or guaranteed savings.
