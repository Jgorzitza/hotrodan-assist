from sync.safety_stock import DemandSeries, z_service_level, fixed_minimum, mad_service_level

def test_fixed_minimum():
    assert fixed_minimum(10) == 10
    assert fixed_minimum(-5) == 0

def test_z_service_level_basic():
    demand = DemandSeries([10, 12, 11, 9, 13, 10, 12])
    ss = z_service_level(demand, lead_time_periods=2, service_level=0.95)
    assert ss >= 0

def test_z_service_level_with_lt_variability():
    demand = DemandSeries([100, 120, 110, 90, 130, 100, 115])
    ss = z_service_level(demand, lead_time_periods=2.5, service_level=0.99, lead_time_stddev=0.5)
    assert ss > 0

def test_mad_service_level():
    demand = DemandSeries([10, 10, 10, 10, 10])
    ss = mad_service_level(demand, lead_time_periods=4, service_level=0.95)
    # zero variability -> zero safety stock
    assert ss == 0

