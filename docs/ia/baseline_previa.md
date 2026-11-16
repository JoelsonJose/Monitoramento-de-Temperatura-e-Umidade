# AI preview problem and baseline

## Preview problem

Estimate the next five-second temperature and humidity readings from the DHT11 history. This is a small forecasting baseline for the preview; it is not a trained AI model and must not be presented as one.

## Physical data and time split

The calculation used the latest 100 consecutive physical readings from device `esp32c3-01`, read from the local API/PostgreSQL on 16 November 2026. The sample covered sequences 693–792 and timestamps 2026-11-16 02:15:23Z–02:23:41Z. The first 80 rows are the earlier portion; the last 20 rows form the time-ordered evaluation segment. No rows were shuffled.

## Baseline

Persistence forecast: for each test row, predict the next temperature and humidity by carrying forward the preceding reading. Metric: mean absolute error (MAE).

| Target | Test points | MAE |
|---|---:|---:|
| Temperature | 20 | 0.01 °C |
| Relative humidity | 20 | 0.10 percentage points |

## Limits and next step

The observed values changed very little over this short, stable eight-minute window. The low MAE only describes this sample and does not show that the baseline works across changing conditions. The final delivery requires at least 48 hours of data, a temporal train/test evaluation, a model that beats a baseline, `/predict`, and a model card. The sample and script of the query are reproducible from the protected API, but the API credentials are intentionally not recorded here.
