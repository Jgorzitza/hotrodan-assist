"""
Advanced machine learning integration for inventory intelligence.

Provides ML-powered forecasting, optimization, and anomaly detection
for enhanced inventory management capabilities.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import json
import pickle
import joblib
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

@dataclass
class MLModel:
    """Machine learning model container."""
    name: str
    model_type: str
    model: Any
    scaler: Optional[Any] = None
    feature_columns: List[str] = None
    target_column: str = None
    accuracy_score: float = 0.0
    last_trained: Optional[datetime] = None
    training_data_size: int = 0

@dataclass
class PredictionResult:
    """ML prediction result."""
    model_name: str
    prediction: float
    confidence: float
    features_used: List[str]
    timestamp: datetime
    additional_info: Dict[str, Any] = None

@dataclass
class AnomalyDetection:
    """Anomaly detection result."""
    is_anomaly: bool
    anomaly_score: float
    feature_contributions: Dict[str, float]
    severity: str  # 'low', 'medium', 'high', 'critical'
    explanation: str

class MLInventoryIntelligence:
    def __init__(self):
        self.models: Dict[str, MLModel] = {}
        self.training_data: Dict[str, pd.DataFrame] = {}
        self.feature_scalers: Dict[str, StandardScaler] = {}
        self.anomaly_detector: Optional[IsolationForest] = None
        self.model_performance: Dict[str, List[float]] = {}
        
        # Initialize default models
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize default ML models."""
        # Demand forecasting model
        self.models["demand_forecast"] = MLModel(
            name="demand_forecast",
            model_type="regression",
            model=RandomForestRegressor(n_estimators=100, random_state=42),
            feature_columns=["historical_demand", "seasonality", "trend", "price", "promotions"],
            target_column="demand"
        )
        
        # Lead time prediction model
        self.models["lead_time_prediction"] = MLModel(
            name="lead_time_prediction",
            model_type="regression",
            model=Ridge(alpha=1.0),
            feature_columns=["supplier_performance", "order_quantity", "seasonality", "supply_chain_health"],
            target_column="lead_time"
        )
        
        # Price optimization model
        self.models["price_optimization"] = MLModel(
            name="price_optimization",
            model_type="regression",
            model=LinearRegression(),
            feature_columns=["demand", "competitor_price", "cost", "seasonality", "inventory_level"],
            target_column="optimal_price"
        )
        
        # Initialize anomaly detector
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
    
    def add_training_data(self, data_type: str, data: pd.DataFrame):
        """Add training data for ML models."""
        self.training_data[data_type] = data.copy()
        print(f"Added {len(data)} records for {data_type} training data")
    
    def prepare_features(self, data: pd.DataFrame, feature_columns: List[str]) -> np.ndarray:
        """Prepare features for ML model training/prediction."""
        # Handle missing values
        data_clean = data[feature_columns].fillna(data[feature_columns].mean())
        
        # Convert to numpy array
        features = data_clean[feature_columns].values
        
        return features
    
    def train_model(self, model_name: str, data_type: str) -> bool:
        """Train a specific ML model."""
        if model_name not in self.models:
            print(f"Model {model_name} not found")
            return False
        
        if data_type not in self.training_data:
            print(f"Training data {data_type} not found")
            return False
        
        model = self.models[model_name]
        data = self.training_data[data_type]
        
        try:
            # Prepare features and target
            X = self.prepare_features(data, model.feature_columns)
            y = data[model.target_column].values
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train model
            model.model.fit(X_train_scaled, y_train)
            model.scaler = scaler
            
            # Evaluate model
            y_pred = model.model.predict(X_test_scaled)
            mae = mean_absolute_error(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            model.accuracy_score = r2
            model.last_trained = datetime.now()
            model.training_data_size = len(data)
            
            # Store performance metrics
            if model_name not in self.model_performance:
                self.model_performance[model_name] = []
            self.model_performance[model_name].append(r2)
            
            print(f"Model {model_name} trained successfully:")
            print(f"  R² Score: {r2:.4f}")
            print(f"  MAE: {mae:.4f}")
            print(f"  MSE: {mse:.4f}")
            
            return True
            
        except Exception as e:
            print(f"Error training model {model_name}: {e}")
            return False
    
    def predict(self, model_name: str, features: Dict[str, float]) -> PredictionResult:
        """Make prediction using trained model."""
        if model_name not in self.models:
            return PredictionResult(
                model_name=model_name,
                prediction=0.0,
                confidence=0.0,
                features_used=[],
                timestamp=datetime.now(),
                additional_info={"error": "Model not found"}
            )
        
        model = self.models[model_name]
        
        if model.scaler is None:
            return PredictionResult(
                model_name=model_name,
                prediction=0.0,
                confidence=0.0,
                features_used=model.feature_columns,
                timestamp=datetime.now(),
                additional_info={"error": "Model not trained"}
            )
        
        try:
            # Prepare features
            feature_values = [features.get(col, 0.0) for col in model.feature_columns]
            feature_array = np.array(feature_values).reshape(1, -1)
            
            # Scale features
            feature_scaled = model.scaler.transform(feature_array)
            
            # Make prediction
            prediction = model.model.predict(feature_scaled)[0]
            
            # Calculate confidence (simplified)
            confidence = min(1.0, max(0.0, model.accuracy_score))
            
            return PredictionResult(
                model_name=model_name,
                prediction=float(prediction),
                confidence=confidence,
                features_used=model.feature_columns,
                timestamp=datetime.now(),
                additional_info={
                    "model_accuracy": model.accuracy_score,
                    "training_data_size": model.training_data_size
                }
            )
            
        except Exception as e:
            return PredictionResult(
                model_name=model_name,
                prediction=0.0,
                confidence=0.0,
                features_used=model.feature_columns,
                timestamp=datetime.now(),
                additional_info={"error": str(e)}
            )
    
    def detect_anomalies(self, data: pd.DataFrame, feature_columns: List[str]) -> List[AnomalyDetection]:
        """Detect anomalies in inventory data."""
        if self.anomaly_detector is None:
            return []
        
        try:
            # Prepare features
            X = self.prepare_features(data, feature_columns)
            
            # Fit anomaly detector if not already fitted
            if not hasattr(self.anomaly_detector, 'decision_scores_'):
                self.anomaly_detector.fit(X)
            
            # Detect anomalies
            anomaly_scores = self.anomaly_detector.decision_function(X)
            anomaly_predictions = self.anomaly_detector.predict(X)
            
            results = []
            for i, (score, is_anomaly) in enumerate(zip(anomaly_scores, anomaly_predictions)):
                if is_anomaly == -1:  # Anomaly detected
                    # Calculate feature contributions (simplified)
                    feature_contributions = {
                        col: abs(X[i][j]) for j, col in enumerate(feature_columns)
                    }
                    
                    # Determine severity
                    if score < -0.5:
                        severity = "critical"
                    elif score < -0.3:
                        severity = "high"
                    elif score < -0.1:
                        severity = "medium"
                    else:
                        severity = "low"
                    
                    results.append(AnomalyDetection(
                        is_anomaly=True,
                        anomaly_score=float(score),
                        feature_contributions=feature_contributions,
                        severity=severity,
                        explanation=f"Anomaly detected with score {score:.3f}"
                    ))
            
            return results
            
        except Exception as e:
            print(f"Error detecting anomalies: {e}")
            return []
    
    def optimize_inventory_with_ml(self, sku_data: Dict[str, Any]) -> Dict[str, Any]:
        """Use ML models to optimize inventory decisions."""
        results = {}
        
        # Predict demand
        demand_prediction = self.predict("demand_forecast", {
            "historical_demand": sku_data.get("historical_demand", 0),
            "seasonality": sku_data.get("seasonality", 0),
            "trend": sku_data.get("trend", 0),
            "price": sku_data.get("price", 0),
            "promotions": sku_data.get("promotions", 0)
        })
        results["demand_prediction"] = demand_prediction
        
        # Predict lead time
        lead_time_prediction = self.predict("lead_time_prediction", {
            "supplier_performance": sku_data.get("supplier_performance", 0),
            "order_quantity": sku_data.get("order_quantity", 0),
            "seasonality": sku_data.get("seasonality", 0),
            "supply_chain_health": sku_data.get("supply_chain_health", 0)
        })
        results["lead_time_prediction"] = lead_time_prediction
        
        # Optimize price
        price_prediction = self.predict("price_optimization", {
            "demand": demand_prediction.prediction,
            "competitor_price": sku_data.get("competitor_price", 0),
            "cost": sku_data.get("cost", 0),
            "seasonality": sku_data.get("seasonality", 0),
            "inventory_level": sku_data.get("inventory_level", 0)
        })
        results["price_optimization"] = price_prediction
        
        # Calculate optimal order quantity
        optimal_quantity = self._calculate_optimal_quantity(
            demand_prediction.prediction,
            lead_time_prediction.prediction,
            sku_data.get("holding_cost", 0),
            sku_data.get("ordering_cost", 0)
        )
        results["optimal_quantity"] = optimal_quantity
        
        # Calculate reorder point
        reorder_point = self._calculate_reorder_point(
            demand_prediction.prediction,
            lead_time_prediction.prediction,
            sku_data.get("safety_stock_multiplier", 1.5)
        )
        results["reorder_point"] = reorder_point
        
        return results
    
    def _calculate_optimal_quantity(self, demand: float, lead_time: float, 
                                  holding_cost: float, ordering_cost: float) -> float:
        """Calculate optimal order quantity using EOQ with ML predictions."""
        if holding_cost <= 0 or ordering_cost <= 0:
            return 0.0
        
        annual_demand = demand * 365
        eoq = np.sqrt((2 * annual_demand * ordering_cost) / holding_cost)
        return float(eoq)
    
    def _calculate_reorder_point(self, demand: float, lead_time: float, 
                               safety_multiplier: float) -> float:
        """Calculate reorder point using ML predictions."""
        return float(demand * lead_time * safety_multiplier)
    
    def generate_ml_report(self) -> Dict[str, Any]:
        """Generate comprehensive ML performance report."""
        report = {
            "timestamp": datetime.now().isoformat(),
            "models": {},
            "overall_performance": {},
            "recommendations": []
        }
        
        # Model performance
        for model_name, model in self.models.items():
            report["models"][model_name] = {
                "model_type": model.model_type,
                "accuracy_score": model.accuracy_score,
                "last_trained": model.last_trained.isoformat() if model.last_trained else None,
                "training_data_size": model.training_data_size,
                "feature_columns": model.feature_columns,
                "target_column": model.target_column
            }
        
        # Overall performance
        if self.model_performance:
            avg_accuracy = np.mean([
                np.mean(scores) for scores in self.model_performance.values()
            ])
            report["overall_performance"] = {
                "average_accuracy": float(avg_accuracy),
                "total_models": len(self.models),
                "trained_models": len([m for m in self.models.values() if m.scaler is not None])
            }
        
        # Recommendations
        recommendations = []
        for model_name, model in self.models.items():
            if model.accuracy_score < 0.7:
                recommendations.append(f"Retrain {model_name} model - accuracy too low ({model.accuracy_score:.3f})")
            if model.training_data_size < 100:
                recommendations.append(f"Collect more training data for {model_name} model")
        
        if not recommendations:
            recommendations.append("All models performing well")
        
        report["recommendations"] = recommendations
        
        return report
    
    def save_models(self, filepath: str):
        """Save trained models to file."""
        model_data = {
            "models": {},
            "scalers": {},
            "model_performance": self.model_performance
        }
        
        for name, model in self.models.items():
            if model.scaler is not None:
                model_data["models"][name] = {
                    "model": model.model,
                    "feature_columns": model.feature_columns,
                    "target_column": model.target_column,
                    "accuracy_score": model.accuracy_score,
                    "last_trained": model.last_trained.isoformat() if model.last_trained else None,
                    "training_data_size": model.training_data_size
                }
                model_data["scalers"][name] = model.scaler
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"Models saved to {filepath}")
    
    def load_models(self, filepath: str):
        """Load trained models from file."""
        try:
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
            
            for name, model_info in model_data["models"].items():
                if name in self.models:
                    self.models[name].model = model_info["model"]
                    self.models[name].feature_columns = model_info["feature_columns"]
                    self.models[name].target_column = model_info["target_column"]
                    self.models[name].accuracy_score = model_info["accuracy_score"]
                    self.models[name].last_trained = datetime.fromisoformat(model_info["last_trained"]) if model_info["last_trained"] else None
                    self.models[name].training_data_size = model_info["training_data_size"]
            
            for name, scaler in model_data["scalers"].items():
                if name in self.models:
                    self.models[name].scaler = scaler
            
            self.model_performance = model_data.get("model_performance", {})
            
            print(f"Models loaded from {filepath}")
            
        except Exception as e:
            print(f"Error loading models: {e}")

def main():
    """Main function for testing ML integration."""
    ml_system = MLInventoryIntelligence()
    
    # Create sample training data
    np.random.seed(42)
    n_samples = 1000
    
    # Demand forecasting data
    demand_data = pd.DataFrame({
        "historical_demand": np.random.normal(100, 20, n_samples),
        "seasonality": np.sin(np.arange(n_samples) * 2 * np.pi / 365),
        "trend": np.arange(n_samples) * 0.1,
        "price": np.random.uniform(10, 100, n_samples),
        "promotions": np.random.choice([0, 1], n_samples, p=[0.8, 0.2]),
        "demand": np.random.normal(100, 20, n_samples)
    })
    
    # Add training data
    ml_system.add_training_data("demand", demand_data)
    
    # Train models
    print("Training demand forecasting model...")
    ml_system.train_model("demand_forecast", "demand")
    
    # Make prediction
    prediction = ml_system.predict("demand_forecast", {
        "historical_demand": 120,
        "seasonality": 0.5,
        "trend": 10,
        "price": 50,
        "promotions": 1
    })
    
    print(f"Prediction: {prediction.prediction:.2f}")
    print(f"Confidence: {prediction.confidence:.2f}")
    
    # Generate report
    report = ml_system.generate_ml_report()
    print("\n=== ML REPORT ===")
    print(json.dumps(report, indent=2, default=str))

if __name__ == "__main__":
    main()
