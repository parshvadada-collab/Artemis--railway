"""
generateSyntheticData.py
========================
Generates a reproducible synthetic dataset of ≥10,000 rows for training
the waitlist confirmation prediction model.

Features generated:
  - waitlist_position      : 1–50 (lower = better chance)
  - days_to_departure      : 0–90
  - booking_class          : 0=SL, 1=3A, 2=2A, 3=1A
  - historical_fill_rate   : 0.50–1.00 (train-specific)
  - day_of_week            : 0–6
  - is_holiday             : 0/1
  - recent_cancel_rate     : 0.00–0.30
  - season                 : 0=off-peak, 1=summer, 2=winter, 3=festive

Target:
  - confirmed              : 1 if booking was eventually confirmed, else 0

Distribution logic:
  - Lower waitlist_position → higher P(confirm)
  - Higher historical_fill_rate → lower P(confirm)
  - Higher recent_cancel_rate → higher P(confirm) (more cancellations free seats)
  - is_holiday & season=festive → lower P(confirm) (high demand)
  - 1A class → slightly higher P(confirm) (people upgrade from lower classes)
"""

import numpy as np
import pandas as pd
import os

RANDOM_SEED = 42
N_ROWS      = 12_000
OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), '..', 'data')
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'historicalBookings.csv')

rng = np.random.default_rng(RANDOM_SEED)


def compute_probability(row):
    """Heuristic log-odds based probability for generating realistic labels."""
    log_odds = 2.5                                        # base intercept

    # Position effect (strong negative)
    log_odds -= 0.12 * row['waitlist_position']

    # Days to departure (moderate positive — closer means more cancellations)
    log_odds += 0.02 * (30 - row['days_to_departure']) * 0.5

    # Historical fill rate (negative — full trains confirm fewer)
    log_odds -= 4.0 * (row['historical_fill_rate'] - 0.7)

    # Recent cancellation rate (positive — more cancellations free seats)
    log_odds += 3.5 * row['recent_cancel_rate']

    # Class effect (1A slightly easier)
    class_boost = {0: 0.0, 1: 0.1, 2: 0.15, 3: 0.25}
    log_odds += class_boost.get(row['booking_class'], 0.0)

    # Holiday / festive penalty
    if row['is_holiday'] == 1:
        log_odds -= 0.5
    if row['season'] == 3:          # festive
        log_odds -= 0.6
    elif row['season'] == 1:        # summer
        log_odds -= 0.3

    return 1.0 / (1.0 + np.exp(-log_odds))


def generate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── Feature generation ────────────────────────────────────────────────────
    waitlist_position    = rng.integers(1, 51, N_ROWS)
    days_to_departure    = rng.integers(0, 91, N_ROWS)
    booking_class        = rng.choice([0, 1, 2, 3], N_ROWS, p=[0.45, 0.30, 0.15, 0.10])
    historical_fill_rate = rng.uniform(0.50, 1.00, N_ROWS).round(3)
    day_of_week          = rng.integers(0, 7, N_ROWS)
    is_holiday           = rng.choice([0, 1], N_ROWS, p=[0.85, 0.15])
    recent_cancel_rate   = rng.uniform(0.00, 0.30, N_ROWS).round(3)
    season               = rng.choice([0, 1, 2, 3], N_ROWS, p=[0.35, 0.25, 0.20, 0.20])

    df = pd.DataFrame({
        'waitlist_position':    waitlist_position,
        'days_to_departure':    days_to_departure,
        'booking_class':        booking_class,
        'historical_fill_rate': historical_fill_rate,
        'day_of_week':          day_of_week,
        'is_holiday':           is_holiday,
        'recent_cancel_rate':   recent_cancel_rate,
        'season':               season,
    })

    # ── Label generation ──────────────────────────────────────────────────────
    probs = df.apply(compute_probability, axis=1)
    # Add slight noise to avoid perfect separation
    noise = rng.normal(0, 0.05, N_ROWS)
    probs_noisy = np.clip(probs + noise, 0.01, 0.99)
    df['confirmed'] = (rng.uniform(0, 1, N_ROWS) < probs_noisy).astype(int)

    # ── Introduce controlled missing values (2%) for realism ─────────────────
    for col in ['historical_fill_rate', 'recent_cancel_rate']:
        mask = rng.choice([True, False], N_ROWS, p=[0.02, 0.98])
        df.loc[mask, col] = np.nan

    df.to_csv(OUTPUT_FILE, index=False)
    print(f"✅ Generated {len(df):,} rows → {OUTPUT_FILE}")
    print(f"   Class distribution (confirmed):\n{df['confirmed'].value_counts(normalize=True).to_string()}")
    return df


if __name__ == '__main__':
    generate()
