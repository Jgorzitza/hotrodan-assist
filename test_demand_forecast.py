from sync.demand_forecast import simple_moving_average, exponential_smoothing, seasonal_adjustment, holt_winters

def test_simple_moving_average():
    history = [10, 12, 11, 9, 13, 10, 12, 14, 11, 13]
    result = simple_moving_average(history, periods=3, forecast_horizon=5)
    assert len(result.periods) == 5
    assert len(result.values) == 5
    assert result.method == "simple_moving_average"

def test_exponential_smoothing():
    history = [10, 12, 11, 9, 13, 10, 12, 14, 11, 13]
    result = exponential_smoothing(history, alpha=0.3, forecast_horizon=4)
    assert len(result.periods) == 4
    assert len(result.values) == 4
    assert result.method == "exponential_smoothing"

def test_seasonal_adjustment():
    # Create seasonal data (higher in summer months)
    history = [100, 120, 150, 180, 200, 220, 180, 150, 120, 100, 80, 90] * 2
    result = seasonal_adjustment(history, season_length=12, forecast_horizon=6)
    assert len(result.periods) == 6
    assert len(result.values) == 6
    assert result.method == "seasonal_adjustment"

def test_holt_winters():
    # Create seasonal data
    history = [100, 120, 150, 180, 200, 220, 180, 150, 120, 100, 80, 90] * 2
    result = holt_winters(history, season_length=12, forecast_horizon=6)
    assert len(result.periods) == 6
    assert len(result.values) == 6
    assert result.method == "holt_winters"
    assert all(v >= 0 for v in result.values)  # Non-negative forecast
