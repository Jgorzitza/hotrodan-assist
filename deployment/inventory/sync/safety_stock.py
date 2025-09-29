"""
Safety stock calculation utilities per SKU/location.

Methods provided:
- z_service_level: Z-score based, using demand stddev and lead time
- fixed_minimum: Constant floor per SKU/location
- mad_service_level: Use Mean Absolute Deviation (robust) then scale

References:
- Safety Stock = Z * sigma_demand * sqrt(lead_time)
- Optionally include lead time variability: sqrt( (avg_LT * sigma_d^2) + (avg_d^2 * sigma_LT^2) )
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional
import math


@dataclass
class DemandSeries:
    # daily or weekly units history, recent first or in order
    values: List[float]

    def mean(self) -> float:
        if not self.values:
            return 0.0
        return sum(self.values) / len(self.values)

    def stddev(self) -> float:
        n = len(self.values)
        if n < 2:
            return 0.0
        m = self.mean()
        var = sum((x - m) ** 2 for x in self.values) / (n - 1)
        return math.sqrt(var)

    def mad(self) -> float:
        if not self.values:
            return 0.0
        m = self.mean()
        return sum(abs(x - m) for x in self.values) / len(self.values)


def z_for_service_level(service_level: float) -> float:
    # Common service levels mapping; fallback to inverse error function
    table = {
        0.90: 1.2816,
        0.95: 1.6449,
        0.97: 1.8808,
        0.98: 2.0537,
        0.99: 2.3263,
    }
    if service_level in table:
        return table[service_level]
    # Approximate using inverse CDF of normal via math.erfcinv
    # Phi^{-1}(p) ~ -sqrt(2) * erfcinv(2p)
    try:
        from math import erfcinv
        return -math.sqrt(2) * erfcinv(2 * service_level)
    except Exception:
        # Fallback conservative
        return 1.6449


def z_service_level(
    demand: DemandSeries,
    lead_time_periods: float,
    service_level: float = 0.95,
    lead_time_stddev: Optional[float] = None,
    average_demand: Optional[float] = None,
) -> int:
    """
    Compute safety stock using Z * sigma_d * sqrt(LT).
    If lead_time_stddev provided, use combined variability model.
    """
    z = z_for_service_level(service_level)
    sigma_d = demand.stddev()
    lt = max(0.0, float(lead_time_periods))

    if lead_time_stddev is None:
        ss = z * sigma_d * math.sqrt(lt)
    else:
        avg_d = average_demand if average_demand is not None else demand.mean()
        sigma_lt = max(0.0, float(lead_time_stddev))
        variance = (lt * (sigma_d ** 2)) + ((avg_d ** 2) * (sigma_lt ** 2))
        ss = z * math.sqrt(max(0.0, variance))

    return max(0, int(round(ss)))


def fixed_minimum(min_qty: int) -> int:
    return max(0, int(min_qty))


def mad_service_level(
    demand: DemandSeries,
    lead_time_periods: float,
    service_level: float = 0.95,
) -> int:
    """
    Robust alternative using MAD. Convert MAD to sigma via c ~ 1.253.
    sigma ~= 1.253 * MAD
    """
    c = 1.253
    mad = demand.mad()
    approx_sigma = c * mad
    z = z_for_service_level(service_level)
    lt = max(0.0, float(lead_time_periods))
    ss = z * approx_sigma * math.sqrt(lt)
    return max(0, int(round(ss)))
