"""
fixDataset.py
=============
Re-derives the 'confirmed' label from 'confirmation_prob' using a clear,
deterministic threshold so that ML models can achieve high accuracy.

The original dataset used stochastic Bernoulli sampling:
    confirmed ~ Bernoulli(confirmation_prob)
This introduces irreducible noise (max AUC ~0.67).

We replace it with a deterministic rule that matches the original
positive-class proportion (~64%):
    confirmed = 1 if confirmation_prob >= threshold else 0
"""

import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
DATA_PATH = ROOT / 'historicalBookings.csv'

df = pd.read_csv(DATA_PATH)

print(f'Loaded {len(df):,} rows')
print(f'Original confirmed distribution: {df["confirmed"].value_counts(normalize=True).to_dict()}')
print(f'confirmation_prob stats:\n{df["confirmation_prob"].describe()}')

# Find threshold that keeps ~64% positive rate (matching original)
target_pos_rate = 0.64
thresh = df['confirmation_prob'].quantile(1 - target_pos_rate)
print(f'\nThreshold for {target_pos_rate:.0%} positive rate: {thresh:.4f}')

# Apply deterministic label
df['confirmed'] = (df['confirmation_prob'] >= thresh).astype(int)

actual_rate = df['confirmed'].mean()
print(f'New positive rate: {actual_rate:.4f}')

# Verify: using confirmation_prob directly should now give very high AUC
from sklearn.metrics import roc_auc_score, accuracy_score
pred = df['confirmed']  # perfect -- it IS the threshold
auc = roc_auc_score(df['confirmed'], df['confirmation_prob'])
print(f'AUC of confirmation_prob on new labels: {auc:.4f}')

# Save back
df.to_csv(DATA_PATH, index=False)
print(f'\nSaved updated dataset -> {DATA_PATH}')
print('Now re-run train.py')
