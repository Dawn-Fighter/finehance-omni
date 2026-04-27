import { useState, useEffect } from "react";

export interface ForecastPoint {
  day: number;
  predicted: number;
  lower: number;
  upper: number;
}

export type TrendDirection = "increasing" | "decreasing" | "stable";

interface ARIMAForecastResult {
  forecast: ForecastPoint[];
  trend: TrendDirection;
  loading: boolean;
  error: string | null;
}

// Mock data simulating a realistic ARIMA(1,1,1) 30-day spending forecast
function generateMockForecast(): {
  forecast: ForecastPoint[];
  trend: TrendDirection;
} {
  const baseSpend = 95;
  const forecast: ForecastPoint[] = [];

  for (let i = 1; i <= 30; i++) {
    const noise = Math.sin(i * 0.4) * 15 + Math.cos(i * 0.7) * 8;
    const trendComponent = i * 0.6;
    const predicted = +(baseSpend + trendComponent + noise).toFixed(2);
    const spread = 10 + i * 1.2;
    forecast.push({
      day: i,
      predicted,
      lower: +(predicted - spread).toFixed(2),
      upper: +(predicted + spread).toFixed(2),
    });
  }

  return { forecast, trend: "increasing" };
}

export function useARIMAForecast(): ARIMAForecastResult {
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [trend, setTrend] = useState<TrendDirection>("stable");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call with a short delay
    const timer = setTimeout(() => {
      try {
        const data = generateMockForecast();
        setForecast(data.forecast);
        setTrend(data.trend);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Forecast failed");
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return { forecast, trend, loading, error };
}
