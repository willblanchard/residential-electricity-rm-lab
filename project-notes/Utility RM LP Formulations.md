# Utility RM LP Formulations

## Data now available

Mukunth's demand-model CSV has 100 building profiles with 24 hourly kW values per building.

Local dashboard copy:

- `Rev Management/utility-rm-dashboard/data/building_demand_models_hourly.csv`
- `Rev Management/utility-rm-dashboard/data/building_demand_summary.csv`

Current summary from the CSV:

- 100 building profiles
- Average-profile peak: 1.4023 kW at hour 19
- Lowest-peak building: `107374-0`, peak 0.0712 kW
- Median-peak building: `108640-0`, peak 1.3318 kW
- Highest-peak building: `108438-0`, peak 8.1054 kW

## Modeling correction

The objectives below are pricing problems. If demand is written as `D(p)` and price is also a decision variable, then revenue `p * D(p)` is generally nonlinear.

To keep the model as a linear program, use one of these approaches:

1. **Discrete price menu LP**: define candidate price levels and choose/allocate among them with linear decision variables.
2. **Piecewise-linear approximation**: approximate revenue as linear segments over demand or price.
3. **Two-step method**: estimate demand response first, then evaluate a finite set of tariff designs in a scenario table.

For the final project, the cleanest approach is probably option 3 for the dashboard and option 1 in the appendix as the formal LP.

## Sets

- `b in B`: buildings / customers
- `h in H`: hours, 0 through 23
- `n in N`: TOU periods, e.g. six 4-hour blocks
- `k in K`: candidate price levels
- `H_peak`: peak-capacity window, e.g. 5pm-9pm or the 2.5 highest-risk hours

## Parameters

- `q_bh`: baseline demand for building `b` in hour `h`, from the demand-model CSV
- `Cap_h`: utility capacity limit in hour `h`
- `p_k`: candidate energy price level
- `r_bhk`: expected demand for building `b`, hour `h`, if price level `k` is used
- `m_bhk = p_k * r_bhk`: expected energy revenue from building `b`, hour `h`, under price level `k`
- `dc_j`: candidate demand-charge price level
- `z_bj`: expected billed peak demand for building `b` under demand-charge level `j`

## Flat-rate LP

Decision variable:

- `x_k`: share or binary selection of flat energy price level `k`

Objective:

```text
max sum_k x_k * sum_b sum_h m_bhk
```

Constraints:

```text
sum_k x_k = 1

sum_b sum_k x_k * r_bhk <= Cap_h       for all h

x_k >= 0                              for all k
```

If using binary selection:

```text
x_k in {0,1}
```

Interpretation:

Flat pricing is simple and revenue-stable, but it has only one price signal. If the capacity constraint binds in only a few hours, the flat price either under-prices peak usage or over-prices off-peak usage.

## Energy plus demand-charge LP

Decision variables:

- `x_k`: selected energy price level
- `y_j`: selected demand-charge level
- `u_bhj`: modeled/expected building demand under demand-charge level `j`
- `peak_bj`: billed peak demand for building `b` under demand-charge level `j`

Objective:

```text
max
  sum_k x_k * sum_b sum_h m_bhk
  + sum_j y_j * sum_b dc_j * peak_bj
```

Peak linearization:

```text
peak_bj >= u_bhj                      for all b, h in H_peak, j
```

Selection:

```text
sum_k x_k = 1
sum_j y_j = 1
```

Capacity:

```text
sum_b demand_bh <= Cap_h              for all h
```

Non-negativity:

```text
x_k, y_j, peak_bj, demand_bh >= 0
```

Interpretation:

The demand charge is closer to capacity-cost recovery because it prices the maximum draw during constrained hours. It should reduce peak usage strongly for automated customers, but it can be confusing or punitive for passive customers.

## TOU LP

Decision variable:

- `x_nk`: selection of price level `k` for TOU period `n`

Objective:

```text
max sum_n sum_k x_nk * sum_b sum_{h in n} m_bhk
```

Selection:

```text
sum_k x_nk = 1                        for all n
```

Capacity:

```text
sum_b sum_k x_n(h)k * r_bhk <= Cap_h  for all h
```

Non-negativity:

```text
x_nk >= 0                             for all n,k
```

Optional operational constraints:

```text
p_peak >= p_mid >= p_off
p_peak <= max_allowed_price
expected_bill_passive <= bill_protection_cap
revenue >= revenue_requirement
```

Interpretation:

TOU pricing is the most natural peak-load pricing strategy. It gives a clear behavioral signal to non-automated customers, but larger price spreads increase the value of automated arbitrage by batteries and flexible devices.

## Dashboard model mapping

The HTML dashboard should expose both layers:

1. **Scenario layer**: finite tariff designs and customer segments shown in the 3x3 matrix.
2. **Optimization layer**: LP-selected price levels or candidate tariff designs feeding the scenario layer.

The raw CSV exports should include:

- building-level hourly demand
- building-level daily kWh and peak kW summary
- scenario-level bill/revenue/peak outcomes
- selected LP tariff parameters

