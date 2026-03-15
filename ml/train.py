"""
train.py
========
Full ML training pipeline for the waitlist confirmation prediction model.

Trains on exactly the 10 base features that predict_server.py accepts:
    waitlist_position, days_to_departure, booking_class_ordinal,
    season_ordinal, day_of_week, is_holiday, special_event,
    historical_fill_rate, recent_cancel_rate, duration_hours

Target: confirmed

Steps:
  1. Load historicalBookings.csv
  2. Drop non-feature columns, keep the 10 exact features + target
  3. Train/test split: 80/20 stratified
  4. 5-fold CV: Random Forest vs XGBoost -- pick winner
  5. Hyperparameter tuning (RandomizedSearchCV)
  6. Calibrate winning model (CalibratedClassifierCV, isotonic)
  7. Evaluate: accuracy, ROC-AUC, precision, recall, F1, confusion matrix
  8. Save plain model -> ml/models/waitlistPredictor.pkl  (joblib)
  9. Save report   -> ml/models/evaluationReport.txt

Acceptance: accuracy >= 0.80 OR ROC-AUC >= 0.85
"""

import sys
import json
import warnings
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.model_selection import (
    train_test_split, StratifiedKFold,
    RandomizedSearchCV, cross_val_score
)
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score, roc_auc_score, precision_score,
    recall_score, f1_score, confusion_matrix, classification_report
)
from xgboost import XGBClassifier

warnings.filterwarnings('ignore')

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT        = Path(__file__).parent
DATA_PATH   = ROOT.parent / 'historicalBookings.csv'
MODEL_DIR   = ROOT / 'models'
MODEL_PATH  = MODEL_DIR / 'waitlistPredictor.pkl'
REPORT_PATH = MODEL_DIR / 'evaluationReport.txt'

MODEL_DIR.mkdir(exist_ok=True)

# ── Exactly the 10 features predict_server.py sends ───────────────────────────
FEATURE_ORDER = [
    'waitlist_position',
    'days_to_departure',
    'booking_class_ordinal',
    'season_ordinal',
    'day_of_week',
    'is_holiday',
    'special_event',
    'historical_fill_rate',
    'recent_cancel_rate',
    'duration_hours',
]
TARGET = 'confirmed'


# ── 1. Load ────────────────────────────────────────────────────────────────────
def load_data():
    print('[1] Loading data...')
    if not DATA_PATH.exists():
        raise FileNotFoundError(f'historicalBookings.csv not found at {DATA_PATH}')
    df = pd.read_csv(DATA_PATH)
    print(f'    Loaded {len(df):,} rows x {df.shape[1]} columns')
    assert len(df) >= 10_000, 'Dataset too small'
    return df


# ── 2. Preprocess ──────────────────────────────────────────────────────────────
def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    print('[2] Preprocessing...')

    # Keep only the 10 features + target
    missing = [c for c in FEATURE_ORDER + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f'Missing columns in CSV: {missing}')

    df = df[FEATURE_ORDER + [TARGET]].copy()

    # Clip outliers
    df['waitlist_position'] = df['waitlist_position'].clip(1, 120)
    df['days_to_departure']  = df['days_to_departure'].clip(0, 120)

    # Impute missing values
    df.fillna(df.median(numeric_only=True), inplace=True)

    print(f'    Missing values after imputation : {df.isnull().sum().sum()}')
    print(f'    Target distribution:')
    print(df[TARGET].value_counts(normalize=True).to_string())
    return df


# ── 3-8. Train ─────────────────────────────────────────────────────────────────
def train(df: pd.DataFrame):
    X = df[FEATURE_ORDER].values
    y = df[TARGET].values

    # [3] Split
    print('\n[3] Train / test split (80/20, stratified)...')
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    print(f'    Train: {len(X_train):,}   Test: {len(X_test):,}')

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # [4a] Random Forest CV
    print('\n[4a] Random Forest -- 5-fold CV ROC-AUC...')
    rf_cv = cross_val_score(
        RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1),
        X_train, y_train, cv=skf, scoring='roc_auc', n_jobs=-1
    )
    print(f'     {rf_cv.mean():.4f} +/- {rf_cv.std():.4f}')

    # [4b] XGBoost CV
    print('\n[4b] XGBoost -- 5-fold CV ROC-AUC...')
    xgb_cv = cross_val_score(
        XGBClassifier(n_estimators=300, learning_rate=0.05, max_depth=5,
                      eval_metric='logloss', random_state=42, n_jobs=-1, verbosity=0),
        X_train, y_train, cv=skf, scoring='roc_auc', n_jobs=-1
    )
    print(f'     {xgb_cv.mean():.4f} +/- {xgb_cv.std():.4f}')

    # [5] Pick winner & tune
    if xgb_cv.mean() >= rf_cv.mean():
        winner_name = 'XGBoost'
        winner_cv   = xgb_cv
        print(f'\n    >> Winner: XGBoost')
        print('\n[5] Hyperparameter tuning -- XGBoost (n_iter=40)...')
        param_dist = {
            'n_estimators':     [200, 300, 400, 500],
            'max_depth':        [3, 4, 5, 6, 7],
            'learning_rate':    [0.01, 0.03, 0.05, 0.1],
            'subsample':        [0.7, 0.8, 0.9, 1.0],
            'colsample_bytree': [0.7, 0.8, 0.9, 1.0],
            'min_child_weight': [1, 3, 5],
            'gamma':            [0, 0.1, 0.2],
            'reg_alpha':        [0, 0.1, 1.0],
            'reg_lambda':       [1, 2, 5],
        }
        base_clf = XGBClassifier(eval_metric='logloss', random_state=42,
                                  n_jobs=-1, verbosity=0)
    else:
        winner_name = 'RandomForest'
        winner_cv   = rf_cv
        print(f'\n    >> Winner: Random Forest')
        print('\n[5] Hyperparameter tuning -- RandomForest (n_iter=40)...')
        param_dist = {
            'n_estimators':      [200, 300, 400, 500],
            'max_depth':         [10, 15, 20, 25, None],
            'min_samples_split': [2, 5, 10],
            'min_samples_leaf':  [1, 2, 4],
            'max_features':      ['sqrt', 'log2', 0.5],
        }
        base_clf = RandomForestClassifier(random_state=42, n_jobs=-1)

    search = RandomizedSearchCV(
        base_clf, param_distributions=param_dist,
        n_iter=40, cv=skf, scoring='roc_auc',
        random_state=42, n_jobs=-1, verbose=1
    )
    search.fit(X_train, y_train)
    best_base   = search.best_estimator_
    best_params = search.best_params_
    print(f'    Best CV ROC-AUC : {search.best_score_:.4f}')
    print(f'    Best params     : {json.dumps(best_params, indent=4, default=str)}')

    # [6] Calibrate
    print('\n[6] Calibrating probabilities (isotonic, 5-fold)...')
    final_model = CalibratedClassifierCV(best_base, method='isotonic', cv=5)
    final_model.fit(X_train, y_train)

    # [7] Evaluate
    print('\n[7] Evaluating on holdout set...')
    y_pred = final_model.predict(X_test)
    y_prob = final_model.predict_proba(X_test)[:, 1]

    acc       = accuracy_score(y_test, y_pred)
    roc_auc   = roc_auc_score(y_test, y_prob)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall    = recall_score(y_test, y_pred, zero_division=0)
    f1        = f1_score(y_test, y_pred, zero_division=0)
    cm        = confusion_matrix(y_test, y_pred)
    cls_rpt   = classification_report(y_test, y_pred,
                    target_names=['waitlisted', 'confirmed'])

    sep = '=' * 52
    print(f'\n{sep}')
    print(f'  HOLDOUT RESULTS  ({winner_name} + Isotonic Calibration)')
    print(sep)
    print(f'  Accuracy  : {acc:.4f}')
    print(f'  ROC-AUC   : {roc_auc:.4f}')
    print(f'  Precision : {precision:.4f}')
    print(f'  Recall    : {recall:.4f}')
    print(f'  F1-Score  : {f1:.4f}')
    print(f'  Confusion Matrix:')
    print(f'    TN={cm[0,0]}  FP={cm[0,1]}')
    print(f'    FN={cm[1,0]}  TP={cm[1,1]}')
    print(f'\n{cls_rpt}')

    passed = acc >= 0.80 or roc_auc >= 0.85
    print(sep)
    status = '[PASS]' if passed else '[WARN]'
    print(f'  {status}  acc={acc:.4f}  roc_auc={roc_auc:.4f}')
    print(sep)

    # [8] Save plain model -- matches predict_server.py exactly
    joblib.dump(final_model, MODEL_PATH)
    print(f'\n[8] Model saved -> {MODEL_PATH}')

    # [9] Save report
    report = f"""Railway Waitlist Prediction -- Evaluation Report
Generated : {pd.Timestamp.now().isoformat()}
=======================================================
Dataset   : {DATA_PATH}
Rows      : {len(df):,}
Features  : {FEATURE_ORDER}

Model     : {winner_name} (Isotonic-Calibrated)
RF CV     : {rf_cv.mean():.4f} +/- {rf_cv.std():.4f}
XGB CV    : {xgb_cv.mean():.4f} +/- {xgb_cv.std():.4f}
Winner CV : {winner_cv.mean():.4f} +/- {winner_cv.std():.4f}

Best hyperparameters:
{json.dumps(best_params, indent=2, default=str)}

------------------------------------------------------
Metric          Value
------------------------------------------------------
Accuracy        {acc:.4f}
ROC-AUC         {roc_auc:.4f}
Precision       {precision:.4f}
Recall          {recall:.4f}
F1-Score        {f1:.4f}
CV ROC-AUC      {winner_cv.mean():.4f} +/- {winner_cv.std():.4f}
------------------------------------------------------

Confusion Matrix:
  TN={cm[0,0]}  FP={cm[0,1]}
  FN={cm[1,0]}  TP={cm[1,1]}

Classification Report:
{cls_rpt}
Acceptance : accuracy >= 0.80 OR ROC-AUC >= 0.85
Status     : {'PASS' if passed else 'FAIL'}
""".strip()
    REPORT_PATH.write_text(report, encoding='utf-8')
    print(f'[9] Report saved -> {REPORT_PATH}')

    return final_model, acc, roc_auc, passed


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print('=' * 52)
    print('  Railway Waitlist ML Training Pipeline')
    print(f'  Features : {len(FEATURE_ORDER)} (exact match with predict_server.py)')
    print('=' * 52)
    df = load_data()
    df = preprocess(df)
    _, acc, roc_auc, passed = train(df)
    sys.exit(0 if passed else 1)
