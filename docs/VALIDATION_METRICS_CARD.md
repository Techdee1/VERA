# Model Validation Metrics Card

This card summarizes the Isolation Forest validation results using the synthetic Nigerian dataset in data/synthetic/transactions.csv.

## Dataset

- Source: Synthetic Nigerian transactions (unlabeled, contains embedded fraud patterns)
- Rows: 2,000
- Window: 90 days

## Model Configuration

- Algorithm: Isolation Forest (unsupervised)
- Contamination: 0.05
- Features: amount_ngn, hour_of_day, day_of_week, sender_degree, receiver_fan_in, is_round_amount

## Validation Results

- Total transactions: 2000
- Labeled anomalies (embedded patterns): 43
- Predicted anomalies: 100
- True positives: 35
- Precision: 0.35
- Recall: 0.814
- F1: 0.4895
- Anomaly rate: 0.05

## Threshold Tuning (Best F1)

- Suggested score threshold: -0.604012
- Tuned precision: 0.8333
- Tuned recall: 0.6977
- Tuned F1: 0.7595
- Tuned anomaly rate: 0.018

## How to Recompute

```bash
python scripts/evaluate_anomaly_model.py
```
