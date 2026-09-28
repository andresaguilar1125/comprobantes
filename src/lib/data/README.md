# Holiday data

Costa Rican **mandatory** holidays ("días feriados de pago obligatorio") — the only
ones that trigger extra pay under this employer's weekly salary scheme.

## Rules baked into this data

- **No transfer logic.** Ley 9875 moved holidays to the following Monday, but its
  window was **2020–2024 only**. For 2026 no legal provision authorises transferring a
  holiday, so each date is observed on its exact date, even on a Saturday or Sunday.
  (Confirmed against the MTSS criterio `MTSS-DAJ-AER-1076-2025` and the official 2026
  calendar.)
- **Non-mandatory holidays are deliberately excluded**, because they are not paid extra
  under a weekly salary scheme. Excluded 2026 dates: 2 Aug, 31 Aug and 1 Dec.
- A holiday landing on a **Sunday** is not paid, since Sunday is the employee's rest day.

## Format

Pure JSON (no comments allowed). `dates` are `"MM-DD"` keys, and every key must have a
matching human-readable `labels` entry, which is printed on the receipt.

```json
[{ "year": 2026, "dates": ["01-01"], "labels": { "01-01": "Año Nuevo" } }]
```

## Adding another year

1. Append a new object with its `year`, `dates` and `labels`.
2. Add the year to `SUPPORTED_YEARS` in `src/lib/domain/config.js`.

That is all — the week selector, holiday detection and receipt template all derive from
this file.

> Verify every new year against the official MTSS calendar before relying on it, and
> re-check whether a holiday-transfer provision has been reinstated.
