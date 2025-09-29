#!/usr/bin/env python3
"""
Advanced Demand Forecasting with Machine Learning
Optimized for large-scale inventory management (1000+ SKUs)
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

try:
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    from scipy import stats
    from statsmodels.tsa.seasonal import seasonal_decompose
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    import patsy
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("Warning: ML libraries not available. Install with: pip install scikit-learn scipy statsmodels patsy")

@dataclass
class DemandForecast:
    sku_id: str
    sku_name: str
    current_demand: float
    forecasted_demand: List[float]
    confidence_interval: Tuple[float, float]
    trend: str
    seasonality_strength: float
    model_accuracy: float
    next_reorder_date: str
    recommended_order_quantity: int
    risk_level: str

@dataclass
class ForecastConfig:
    forecast_periods: int = 12
    confidence_level: float = 0.95
    min_training_data: int = 30
    enable_seasonality: bool = True
    enable_trend_analysis: bool = True
    model_ensemble: bool = True

class AdvancedDemandForecaster:
    """
    Advanced demand forecasting using multiple ML algorithms
    Optimized for production-scale inventory management
    """
    
    def __init__(self, config: ForecastConfig = None):
        self.config = config or ForecastConfig()
        self.models = {}
        self.scalers = {}
        self.feature_importance = {}
        
    def forecast_demand(self, sku_data: Dict) -> DemandForecast:
        """
        Generate comprehensive demand forecast for a single SKU
        """
        try:
            # Prepare time series data
            ts_data = self._prepare_time_series(sku_data)
            
            if len(ts_data) < self.config.min_training_data:
                return self._create_basic_forecast(sku_data)
            
            # Generate features
            features = self._extract_features(ts_data)
            
            # Train models
            if self.config.model_ensemble:
                forecast_values, confidence = self._ensemble_forecast(features, ts_data)
            else:
                forecast_values, confidence = self._single_model_forecast(features, ts_data)
            
            # Analyze patterns
            trend = self._analyze_trend(ts_data)
            seasonality = self._analyze_seasonality(ts_data)
            
            # Calculate risk and recommendations
            risk_level = self._assess_risk(forecast_values, confidence)
            reorder_date = self._calculate_reorder_date(sku_data, forecast_values[0])
            order_quantity = self._calculate_order_quantity(sku_data, forecast_values)
            
            return DemandForecast(
                sku_id=sku_data['id'],
                sku_name=sku_data['name'],
                current_demand=ts_data[-1] if len(ts_data) > 0 else 0,
                forecasted_demand=forecast_values,
                confidence_interval=confidence,
                trend=trend,
                seasonality_strength=seasonality,
                model_accuracy=self._calculate_accuracy(features, ts_data),
                next_reorder_date=reorder_date,
                recommended_order_quantity=order_quantity,
                risk_level=risk_level
            )
            
        except Exception as e:
            print(f"Error forecasting for SKU {sku_data.get('id', 'unknown')}: {e}")
            return self._create_basic_forecast(sku_data)
    
    def _prepare_time_series(self, sku_data: Dict) -> np.ndarray:
        """Prepare time series data from SKU historical data"""
        # Extract historical demand data
        trend_data = sku_data.get('trend', [])
        if not trend_data:
            # Fallback to velocity data
            velocity = sku_data.get('velocity', {})
            weekly_demand = velocity.get('lastWeekUnits', 0)
            return np.array([weekly_demand] * 4)  # Create minimal data
        
        # Convert to numpy array
        demand_values = [point.get('units', 0) for point in trend_data]
        return np.array(demand_values)
    
    def _extract_features(self, ts_data: np.ndarray) -> np.ndarray:
        """Extract features for ML models"""
        features = []
        
        # Basic statistical features
        features.extend([
            np.mean(ts_data),
            np.std(ts_data),
            np.min(ts_data),
            np.max(ts_data),
            np.median(ts_data)
        ])
        
        # Trend features
        if len(ts_data) > 1:
            features.extend([
                np.polyfit(range(len(ts_data)), ts_data, 1)[0],  # Linear trend slope
                np.corrcoef(range(len(ts_data)), ts_data)[0, 1]  # Trend correlation
            ])
        else:
            features.extend([0, 0])
        
        # Lag features
        for lag in [1, 2, 3, 7]:
            if len(ts_data) > lag:
                features.append(ts_data[-lag])
            else:
                features.append(0)
        
        # Seasonal features (if enough data)
        if len(ts_data) >= 12:
            try:
                seasonal_decomp = seasonal_decompose(ts_data, model='additive', period=4)
                features.extend([
                    np.std(seasonal_decomp.seasonal),
                    np.std(seasonal_decomp.resid)
                ])
            except:
                features.extend([0, 0])
        else:
            features.extend([0, 0])
        
        return np.array(features).reshape(1, -1)
    
    def _ensemble_forecast(self, features: np.ndarray, ts_data: np.ndarray) -> Tuple[List[float], Tuple[float, float]]:
        """Generate forecast using ensemble of models"""
        if not ML_AVAILABLE:
            return self._simple_forecast(ts_data)
        
        # Prepare training data
        X, y = self._prepare_training_data(ts_data)
        
        if len(X) < 5:  # Not enough data for ML
            return self._simple_forecast(ts_data)
        
        # Train multiple models
        models = {
            'rf': RandomForestRegressor(n_estimators=100, random_state=42),
            'gb': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'lr': LinearRegression()
        }
        
        predictions = []
        accuracies = []
        
        for name, model in models.items():
            try:
                # Scale features
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X)
                features_scaled = scaler.transform(features)
                
                # Train model
                model.fit(X_scaled, y)
                
                # Make prediction
                pred = model.predict(features_scaled)[0]
                predictions.append(pred)
                
                # Calculate accuracy
                y_pred = model.predict(X_scaled)
                accuracy = r2_score(y, y_pred)
                accuracies.append(max(0, accuracy))
                
                # Store for later use
                self.models[name] = model
                self.scalers[name] = scaler
                
            except Exception as e:
                print(f"Error training {name}: {e}")
                predictions.append(np.mean(ts_data))
                accuracies.append(0.5)
        
        # Weighted ensemble prediction
        if accuracies:
            weights = np.array(accuracies) / np.sum(accuracies)
            ensemble_pred = np.average(predictions, weights=weights)
        else:
            ensemble_pred = np.mean(predictions) if predictions else np.mean(ts_data)
        
        # Calculate confidence interval
        pred_std = np.std(predictions) if len(predictions) > 1 else np.std(ts_data)
        confidence = (
            ensemble_pred - 1.96 * pred_std,
            ensemble_pred + 1.96 * pred_std
        )
        
        # Generate forecast for multiple periods
        forecast_values = []
        for i in range(self.config.forecast_periods):
            # Simple trend continuation for multi-period forecast
            trend_factor = 1 + (i * 0.02)  # 2% growth assumption
            forecast_values.append(max(0, ensemble_pred * trend_factor))
        
        return forecast_values, confidence
    
    def _single_model_forecast(self, features: np.ndarray, ts_data: np.ndarray) -> Tuple[List[float], Tuple[float, float]]:
        """Generate forecast using a single model"""
        if not ML_AVAILABLE or len(ts_data) < 5:
            return self._simple_forecast(ts_data)
        
        # Use Random Forest as default
        model = RandomForestRegressor(n_estimators=50, random_state=42)
        X, y = self._prepare_training_data(ts_data)
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        features_scaled = scaler.transform(features)
        
        model.fit(X_scaled, y)
        prediction = model.predict(features_scaled)[0]
        
        # Generate multi-period forecast
        forecast_values = [max(0, prediction)] * self.config.forecast_periods
        
        # Calculate confidence
        y_pred = model.predict(X_scaled)
        mae = mean_absolute_error(y, y_pred)
        confidence = (prediction - 1.96 * mae, prediction + 1.96 * mae)
        
        return forecast_values, confidence
    
    def _simple_forecast(self, ts_data: np.ndarray) -> Tuple[List[float], Tuple[float, float]]:
        """Simple forecast when ML is not available or data is insufficient"""
        if len(ts_data) == 0:
            return [0] * self.config.forecast_periods, (0, 0)
        
        # Use moving average with trend
        recent_avg = np.mean(ts_data[-4:]) if len(ts_data) >= 4 else np.mean(ts_data)
        
        # Calculate simple trend
        if len(ts_data) > 1:
            trend = (ts_data[-1] - ts_data[0]) / len(ts_data)
        else:
            trend = 0
        
        forecast_values = []
        for i in range(self.config.forecast_periods):
            value = max(0, recent_avg + trend * (i + 1))
            forecast_values.append(value)
        
        # Simple confidence interval
        std_dev = np.std(ts_data) if len(ts_data) > 1 else recent_avg * 0.2
        confidence = (recent_avg - 1.96 * std_dev, recent_avg + 1.96 * std_dev)
        
        return forecast_values, confidence
    
    def _prepare_training_data(self, ts_data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare training data for ML models"""
        if len(ts_data) < 5:
            return np.array([]).reshape(0, 1), np.array([])
        
        X, y = [], []
        for i in range(1, len(ts_data)):
            # Use previous values as features
            features = [ts_data[i-1]]
            if i > 1:
                features.append(ts_data[i-2])
            if i > 2:
                features.append(ts_data[i-3])
            
            X.append(features)
            y.append(ts_data[i])
        
        return np.array(X), np.array(y)
    
    def _analyze_trend(self, ts_data: np.ndarray) -> str:
        """Analyze trend direction"""
        if len(ts_data) < 2:
            return "stable"
        
        # Linear regression to determine trend
        x = np.arange(len(ts_data))
        slope, _, _, _, _ = stats.linregress(x, ts_data)
        
        if slope > 0.1:
            return "increasing"
        elif slope < -0.1:
            return "decreasing"
        else:
            return "stable"
    
    def _analyze_seasonality(self, ts_data: np.ndarray) -> float:
        """Analyze seasonality strength"""
        if len(ts_data) < 12:
            return 0.0
        
        try:
            # Use seasonal decomposition
            seasonal_decomp = seasonal_decompose(ts_data, model='additive', period=4)
            seasonal_std = np.std(seasonal_decomp.seasonal)
            trend_std = np.std(seasonal_decomp.trend)
            
            if trend_std > 0:
                return min(1.0, seasonal_std / trend_std)
            else:
                return 0.0
        except:
            return 0.0
    
    def _assess_risk(self, forecast: List[float], confidence: Tuple[float, float]) -> str:
        """Assess forecast risk level"""
        forecast_std = (confidence[1] - confidence[0]) / (2 * 1.96)  # Convert to std dev
        forecast_mean = np.mean(forecast)
        
        if forecast_mean == 0:
            return "low"
        
        cv = forecast_std / forecast_mean  # Coefficient of variation
        
        if cv > 0.5:
            return "high"
        elif cv > 0.3:
            return "medium"
        else:
            return "low"
    
    def _calculate_reorder_date(self, sku_data: Dict, next_demand: float) -> str:
        """Calculate next reorder date"""
        on_hand = sku_data.get('onHand', 0)
        committed = sku_data.get('committed', 0)
        net_available = on_hand - committed
        
        if net_available <= 0 or next_demand <= 0:
            return datetime.now().isoformat()
        
        days_until_reorder = int(net_available / next_demand)
        reorder_date = datetime.now() + timedelta(days=days_until_reorder)
        return reorder_date.isoformat()
    
    def _calculate_order_quantity(self, sku_data: Dict, forecast: List[float]) -> int:
        """Calculate recommended order quantity"""
        avg_forecast = np.mean(forecast)
        lead_time_days = 30  # Default lead time
        safety_factor = 1.2  # 20% safety stock
        
        order_quantity = int(avg_forecast * lead_time_days * safety_factor)
        return max(1, order_quantity)  # Minimum order of 1
    
    def _calculate_accuracy(self, features: np.ndarray, ts_data: np.ndarray) -> float:
        """Calculate model accuracy"""
        if not ML_AVAILABLE or len(ts_data) < 5:
            return 0.5  # Default accuracy
        
        try:
            X, y = self._prepare_training_data(ts_data)
            if len(X) < 3:
                return 0.5
            
            # Simple train/test split
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
            
            if len(X_train) < 2:
                return 0.5
            
            model = RandomForestRegressor(n_estimators=50, random_state=42)
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
            
            r2 = r2_score(y_test, y_pred)
            return max(0, min(1, r2))  # Clamp between 0 and 1
            
        except:
            return 0.5
    
    def _create_basic_forecast(self, sku_data: Dict) -> DemandForecast:
        """Create basic forecast when advanced methods fail"""
        velocity = sku_data.get('velocity', {})
        current_demand = velocity.get('lastWeekUnits', 0)
        
        # Simple forecast: assume current demand continues
        forecast_values = [current_demand] * self.config.forecast_periods
        confidence = (current_demand * 0.8, current_demand * 1.2)
        
        return DemandForecast(
            sku_id=sku_data.get('id', 'unknown'),
            sku_name=sku_data.get('name', 'Unknown SKU'),
            current_demand=current_demand,
            forecasted_demand=forecast_values,
            confidence_interval=confidence,
            trend="stable",
            seasonality_strength=0.0,
            model_accuracy=0.5,
            next_reorder_date=datetime.now().isoformat(),
            recommended_order_quantity=max(1, int(current_demand * 4)),
            risk_level="medium"
        )

def batch_forecast_skus(sku_data_list: List[Dict], config: ForecastConfig = None) -> List[DemandForecast]:
    """
    Generate forecasts for multiple SKUs efficiently
    """
    forecaster = AdvancedDemandForecaster(config)
    forecasts = []
    
    print(f"Generating forecasts for {len(sku_data_list)} SKUs...")
    
    for i, sku_data in enumerate(sku_data_list):
        try:
            forecast = forecaster.forecast_demand(sku_data)
            forecasts.append(forecast)
            
            if (i + 1) % 100 == 0:
                print(f"Processed {i + 1}/{len(sku_data_list)} SKUs")
                
        except Exception as e:
            print(f"Error processing SKU {sku_data.get('id', 'unknown')}: {e}")
            # Create basic forecast as fallback
            forecasts.append(forecaster._create_basic_forecast(sku_data))
    
    return forecasts

# Example usage and testing
if __name__ == "__main__":
    # Test with sample data
    sample_sku = {
        'id': 'SKU001',
        'name': 'Test Product',
        'onHand': 100,
        'committed': 20,
        'velocity': {'lastWeekUnits': 15},
        'trend': [
            {'units': 10, 'date': '2024-01-01'},
            {'units': 12, 'date': '2024-01-08'},
            {'units': 15, 'date': '2024-01-15'},
            {'units': 18, 'date': '2024-01-22'},
            {'units': 20, 'date': '2024-01-29'},
            {'units': 15, 'date': '2024-02-05'},
        ]
    }
    
    config = ForecastConfig(forecast_periods=6, confidence_level=0.95)
    forecaster = AdvancedDemandForecaster(config)
    
    forecast = forecaster.forecast_demand(sample_sku)
    
    print("=== DEMAND FORECAST RESULTS ===")
    print(f"SKU: {forecast.sku_name}")
    print(f"Current Demand: {forecast.current_demand:.2f}")
    print(f"Forecast: {[f'{x:.2f}' for x in forecast.forecasted_demand]}")
    print(f"Confidence: {forecast.confidence_interval}")
    print(f"Trend: {forecast.trend}")
    print(f"Seasonality: {forecast.seasonality_strength:.2f}")
    print(f"Accuracy: {forecast.model_accuracy:.2f}")
    print(f"Risk Level: {forecast.risk_level}")
    print(f"Reorder Date: {forecast.next_reorder_date}")
    print(f"Order Quantity: {forecast.recommended_order_quantity}")
