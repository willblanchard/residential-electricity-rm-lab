# Utility RM Dashboard

Open `index.html` in a browser to start the eight-page presentation site.

The pages are intentionally static and dependency-free so they can be submitted,
shared, or hosted anywhere. The interactive Single Price Results and Parallel Options Results pages combine
an illustrative utility economics model with static NLR/OEDI end-use load data
and static WattShift tariff outputs.

## File structure

- `index.html`: Summary / Intro page and eight-page navigation map.
- `wtp-segmentation.html`: WTP + Segmentation calibration page built from the
  demand-curve source files.
- `optimization-model.html`: model objective, variables, and constraints.
- `implementation-validation.html`: implementation and validation narrative.
- `phase1.html`: interactive single-price-results dashboard.
- `phase2.html`: interactive parallel-options-results / adverse-selection page.
- `limitations-future-work.html`: caveats and extension paths.
- `final-takeaway.html`: closing recommendation.
- `phase3.html`: compatibility redirect to `wtp-segmentation.html`.
- `styles.css`: design tokens, layout, responsive rules, chart containers, and
  control styling.
- `profiles.js`: generated 100-profile building-demand ensemble used to vary
  hourly load shape while preserving the baseline monthly usage level.
- `app.js`: embedded data, tariff calibration, customer/device response models,
  chart renderers, controls, and CSV export logic.
- `phase2.js`: standalone parallel-options model for switchers, fixed-rate stayers,
  revenue leakage, rebalancing pressure, and segment-level opt-in behavior.
- `phase3-data.js` and `phase3.js`: generated WTP data plus the calibration
  charts and controls.
- `data/`: static source and seed CSV/JSON files used for downloads and audit.
- `scripts/`: one-off data build/pull utilities for regenerating static inputs.

The site follows the presentation structure in eight named pages: Summary /
Intro, WTP + Segmentation, Optimization Model, Implementation, Single Price Results,
Parallel Options Results, Limitations, and Takeaway. The Single Price Results screen is framed as a utility-board case
study: TOU and
demand-charge tariffs are calibrated to be approximately revenue-neutral for
an all-inelastic baseline, then the dashboard tests how that neutrality evolves
as smart thermostat and battery adoption expands. The core result is that a
rate can collect less revenue from responsive homes while still improving
utility margin because those homes consume less high-cost evening energy and
scarce grid capacity.

The old 3x3 framing is expanded into a 3 x 2 x 2 x 2 structure:

- 3 rate plans: flat, TOU, and demand charge.
- 2 behavior types: passive / inelastic and somewhat elastic non-controlled
  load.
- 2 thermostat states: no automated thermostat or automated thermostat.
- 2 battery states: no automated home battery or automated home battery.

This creates eight population buckets per rate plan: no devices, just
thermostat, just battery, and both, split across passive and elastic behavior.
The population revenue map shows all 24 rate-plan/bucket outcomes and lets the
viewer click through to the reactive usage pattern for each case.

The dashboard also includes a price-differential sensitivity exhibit. It holds
the population mix fixed and plots revenue and gross-margin deltas against the
flat fixed-rate baseline as the TOU peak/off-peak spread or demand-charge level
changes.

## Phase boundary

`phase1.html` is Single Price Results: a universal-rate comparison where flat, TOU, and
demand-charge tariffs are each applied to the same portfolio mix. It does not
model customers choosing among parallel fixed-rate and optional TOU/demand
plans.

Population leakage and adverse selection from optional rate choice belong in a
separate Parallel Options Results page or model. That extension should track switchers versus
fixed-rate stayers, revenue leakage, cost shift, and bill-protection guardrails
without changing the current page's core KPIs.

## Tariff optimization model

The optimizer is a transparent grid search over the two non-flat tariff decision
variables:

- TOU decision variable: peak/off-peak spread from 1.0x to 5.0x in 0.10x steps.
- Demand-charge decision variable: $0 to $50/kW-month in $1 steps.

For each candidate, the tariff is first calibrated to match the passive
flat-rate filing baseline. The model then applies the current population mix,
the device-response assumptions, and 100 normalized building-demand profiles,
computing portfolio revenue, energy cost, capacity cost, gross margin, total
kWh, and peak kW. The capacity screen uses the source `Capacity.mlx` estimate
that 68 kWh in 15 minutes equals 272 kW for the 100-building source portfolio,
scaled to the 10,000-home case-study population. The objective is:

```text
maximize gross margin versus flat
subject to realized revenue >= 95% of flat revenue
and portfolio peak <= 27,200 kW
and passive filing-baseline revenue within +/- 0.5% of flat
```

The dashboard displays the best feasible candidate when one clears the
constraints. If a tariff family has no fully feasible point after device
response, it keeps that fallback frontier point marked as a constraint violation
rather than treating it as approved. `Download optimization CSV` exports the
full candidate grid so the paper can cite both the chosen point and the
surrounding frontier.

## Exports

- `Download scenario CSV`: exports the currently selected tariff controls,
  population buckets, and 24 population outcome rows.
- `Download optimization CSV`: exports the TOU and demand-charge candidate grid,
  feasibility flags, rates, revenue, costs, margin, kWh, and peak kW.
- `Download load CSV`: exports the embedded NLR/OEDI high-peak-day end-use
  load shape.
- `Download HVAC CSV`: exports the current thermostat/TOU response model:
  hourly price signal, baseline HVAC, optimized HVAC, and whole-home impact.
- `Download battery CSV`: exports hourly battery state of charge, grid import,
  home load, charge/discharge, and action labels under the current controls.
- `End-use CSV`: downloads the static NLR/OEDI high-peak-day category profile.

Static seed copies are also available under `data/`.

## Regression checks

The model has a dependency-free Node regression check:

```bash
node tests/model-regression.mjs
```

It verifies no-signal parity against flat pricing, optimizer feasibility,
capacity-screen compliance, optimization CSV shape, and removal of the old 3x3
scenario path.

## NLR/OEDI end-use data

The dashboard uses a compact extract from the National Laboratory of the
Rockies / Open Energy Data Initiative End-Use Load Profiles dataset:

- source page: `https://www.nlr.gov/buildings/end-use-load-profiles`
- source object: `s3://oedi-data-lake/nrel-pds-building-stock/end-use-load-profiles-for-us-building-stock/2021/resstock_amy2018_release_1/timeseries_aggregates/by_state/state=IL/il-single-family_detached.csv`
- geography/building type: Illinois, single-family detached
- selection rule: complete day with the highest hourly total kW
- selected peak day: 2018-06-30

Generated outputs:

- `data/nlr_end_use_profile_il_sfd_peak_day.csv`
- `data/nlr_end_use_profile_il_sfd_annual_average.csv`
- `data/nlr_end_use_profile_il_sfd_summary.csv`

To rebuild after downloading the raw aggregate CSV:

```bash
node scripts/build_nlr_end_use_profile.mjs /path/to/il-single-family_detached.csv
```

## WattShift static data

The dashboard uses static WattShift CSV/JSON files generated by a one-off API
pull. It does not include a browser-side API bridge or any stored API key.

For a one-off static data pull without storing a key:

```bash
node scripts/pull_wattshift_static_data.mjs --stdin-key < /path/to/key-file
```

or:

```bash
printf '%s' "$WATTSHIFT_API_KEY" | node scripts/pull_wattshift_static_data.mjs --stdin-key
```

Generated outputs:

- `data/wattshift_rate_plans.csv`
- `data/wattshift_selected_rate_plans.csv`
- `data/wattshift_price_signals.csv`
- `data/wattshift_bill_estimates.csv`
- raw JSON companion files for audit/debugging

## Demand model data

`data/building_demand_models_hourly.csv` is copied from:

`/Users/willblanchard/Downloads/Building Demand Models Hourly Demand Functions.csv`

`data/building_demand_summary.csv` is a derived summary with daily kWh, peak kW,
peak hour, and a simple low/mid/high peak segment hint for each building.

`profiles.js` is generated from the hourly CSV so the browser can run from
`file://` without a fetch step. Each profile is normalized to the NLR/OEDI daily
energy total before being used in economics calculations. This preserves the
$164/month flat-rate baseline while adding customer-level peak and shape
diversity.

The optimization layer uses the source `Analysis` files for capacity and
future WTP calibration rather than browser-loaded dependencies:

- `demand_curve.xlsx`: 100 building-level linear demand curves.
- `annual_demand.xlsx`: annual demand used to normalize the demand-curve
  response.
- `Capacity.mlx`: portfolio peak screen; 68 kWh per 15 minutes = 272 kW for
  the 100-building source portfolio.

Single-price and parallel-options dashboard economics keep the current class-story boundary: passive
loads remain inelastic, elastic non-controlled loads use a transparent bounded
shift heuristic, and automated devices respond to price/capacity signals. The
building-level WTP curve is summarized on the WTP + Segmentation page and used
to explain how effective prices translate into demand response. Automated
batteries are tested against the same portfolio-shaped peak used in the
economics table.

Open `wtp-segmentation.html` to inspect the full WTP layer: energy price, capacity charge,
raw-vs-bounded demand curve mode, monthly revenue frontier, demand response
curve, building scatter, capacity screen, and building-level output table.

## HVAC response model

The dashboard includes a simple savings-calculator-style HVAC response layer:
it uses the NLR HVAC category as controllable load, shifts a bounded share of
late-day peak HVAC demand into pre-cooling hours under TOU, and clips the
home's highest-load hours under the demand-charge tariff. It applies an
efficiency benefit for moving cooling earlier in the day and exposes the
adjusted profile through `Download HVAC CSV`.

Default controls use a 2.0x TOU peak spread and 3°F thermostat adjustment.

## Battery response model

The dashboard also includes an automated home-battery dispatch policy. It can be
applied by itself or layered on top of thermostat control. The battery charges
when the price signal is low, preserves state of charge for the late-day peak,
and discharges to reduce high-price grid imports under TOU. Under a demand
charge, it solves a simple meter-peak cap for each normalized demand profile so
the home battery can materially lower the customer's billed kW rather than only
following the average portfolio peak window. This is a transparent heuristic
dispatch model, not a solved household battery LP. The `Battery size` control
changes capacity and the exported `utility_rm_battery_response.csv` contains
hourly SOC, charge/discharge, home load, grid import, and price.

## Utility economics model

Rate plans are stylized but explicit and calibrated around the same passive
baseline:

- Flat: 18.0 cents/kWh all day.
- TOU: an off-peak / shoulder / peak ratio based on the selected TOU spread,
  scaled so passive-household revenue matches the flat-rate baseline.
- Demand charge: $20/kW-month plus a lower calibrated energy charge, again
  set so passive-household revenue matches the flat-rate baseline.

Utility costs use a simple duck-curve wholesale energy proxy with low midday
costs and high evening costs, plus a $20/kW-month capacity-cost proxy. That
capacity number is intentionally a high-tightness case-study anchor, not a
claim about every ISO:

- ISO-NE FCA 18 cleared at about $3.58/kW-month.
- CAISO's CPM soft offer cap moved to $7.34/kW-month in 2024.
- PJM's 2026/2027 BRA clearing price of $329.17/MW-day converts to roughly
  $10/kW-month.
- MISO's 2025 summer PRA price of $666.50/MW-day converts to roughly
  $20/kW-month, which is the value used in the dashboard.

For demand-charge customers with behind-the-meter automation, billed demand and
utility capacity risk are intentionally separated. A battery can lower the
customer's non-coincident meter peak more sharply than it lowers the utility's
coincident planning obligation, so only a bounded share of shaved billed kW is
credited as avoided capacity cost.

Source anchors for the paper write-up:

- EIA on CAISO duck-curve wholesale price shape: `https://www.eia.gov/todayinenergy/detail.php?id=32172`
- PJM 2026/2027 Base Residual Auction result: `https://insidelines.pjm.com/pjm-auction-procures-134311-mw-of-generation-resources-supply-responds-to-price-signal/`
- MISO 2025 Planning Resource Auction result: `https://www.misoenergy.org/meet-miso/media-center/2025---news-releases/misos-planning-resource-auction-indicates-sufficient-resources/`
- ISO-NE Forward Capacity Auction history: `https://www.iso-ne.com/about/key-stats/markets`
- CAISO CPM soft offer cap notice: `https://www.caiso.com/notices/capacity-procurement-mechanism-enhancements-track-2-cpm-soft-offer-cap-effective-date-6-1-24`
