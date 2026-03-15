# ml/predict_server.py
from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "waitlistPredictor.pkl")
model = joblib.load(MODEL_PATH)
print(f"Model loaded from {MODEL_PATH}")

FEATURE_ORDER = [
    "waitlist_position", "days_to_departure", "booking_class_ordinal",
    "season_ordinal", "day_of_week", "is_holiday", "special_event",
    "historical_fill_rate", "recent_cancel_rate", "duration_hours"
]

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    missing = [f for f in FEATURE_ORDER if f not in data]
    if missing:
        return jsonify({"error": f"Missing features: {missing}"}), 400

    features = np.array([[data[f] for f in FEATURE_ORDER]])
    prob = float(model.predict_proba(features)[0][1])

    if prob >= 0.75:
        confidence = "high"
        label = "very likely confirmed"
    elif prob >= 0.45:
        confidence = "medium"
        label = "likely confirmed"
    else:
        confidence = "low"
        label = "unlikely to confirm"

    return jsonify({
        "confirmation_probability": round(prob, 4),
        "confidence": confidence,
        "label": label
    })

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Railway Ticket Prediction API is running",
        "endpoints": {
            "health": "GET /health",
            "predict": "POST /predict"
        }
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "waitlistPredictor"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=False)
