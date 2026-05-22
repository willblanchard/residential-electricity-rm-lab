# Utility RM Dashboard

Open `index.html` in a browser to view the interactive project artifact.

The page is intentionally static and dependency-free so it can be submitted,
shared, or hosted anywhere. It combines an illustrative utility economics model
with static NLR/OEDI end-use load data, normalized building-demand profiles, and
stylized residential tariff cases.

## File structure

- `index.html`: static markup and section structure.
- `styles.css`: design tokens, layout, responsive rules, chart containers, and
  control styling.
- `profiles.js`: generated 100-profile building-demand ensemble used to vary
  hourly load shape while preserving the baseline monthly usage level.
- `app.js`: embedded data, tariff calibration, customer/device response models,
  chart renderers, controls, and CSV export logic.
- `data/`: static source and seed CSV/JSON files used for downloads and audit.
- `scripts/`: one-off public-data build utilities for regenerating static
  inputs.
- `tests/`: dependency-free model regression checks.
- `project-notes/`: class-project scratch notes and LP formulation notes.

The public GitHub Pages site is served directly from this repository root. No
browser-side API key, secret, or private API output is required.

The first screen is framed as a utility-board case study: TOU and
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

## Tariff optimization model

The optimizer is a transparent grid search over the two non-flat tariff decision
variables:

- TOU decision variable: peak/off-peak spread from 1.0x to 5.0x in 0.10x steps.
- Demand-charge decision variable: $0 to $30/kW-month in $1 steps.

For each candidate, the tariff is first calibrated to match the passive
flat-rate filing baseline. The model then applies the current population mix,
the device-response assumptions, and 100 normalized building-demand profiles,
computing portfolio revenue, energy cost, capacity cost, gross margin, total
kWh, and peak kW. The objective is:

```text
maximize gross margin versus flat
subject to realized revenue >= 95% of flat revenue
and portfolio peak <= 30,000 kW
and passive filing-baseline revenue within +/- 0.5% of flat
```

The dashboard displays the best feasible TOU and demand-charge candidates and
the top frontier points near each optimum, and lets the viewer apply either
setting to the interactive controls. `Download optimization CSV` exports the
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
and discharges to reduce high-price grid imports under TOU or clip the
highest-load hours under the demand-charge tariff. This is a transparent
heuristic dispatch model, not a solved household battery LP. The `Battery size`
control changes capacity and the exported `utility_rm_battery_response.csv`
contains hourly SOC, charge/discharge, home load, grid import, and price.

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

Source anchors for the paper write-up:

- EIA on CAISO duck-curve wholesale price shape: `https://www.eia.gov/todayinenergy/detail.php?id=32172`
- PJM 2026/2027 Base Residual Auction result: `https://insidelines.pjm.com/pjm-auction-procures-134311-mw-of-generation-resources-supply-responds-to-price-signal/`
- MISO 2025 Planning Resource Auction result: `https://www.misoenergy.org/meet-miso/media-center/2025---news-releases/misos-planning-resource-auction-indicates-sufficient-resources/`
- ISO-NE Forward Capacity Auction history: `https://www.iso-ne.com/about/key-stats/markets`
- CAISO CPM soft offer cap notice: `https://www.caiso.com/notices/capacity-procurement-mechanism-enhancements-track-2-cpm-soft-offer-cap-effective-date-6-1-24`
