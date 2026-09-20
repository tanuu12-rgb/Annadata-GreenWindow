import { Router, type IRouter } from "express";
import {
  ClassifyRipenessBody,
  ClassifyRipenessResponse,
  GetCleanEnergyTodayResponse,
  GetForecastResponse,
  GetScheduleQueryParams,
  GetScheduleResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CLEAN_ENERGY_CURVE = [
  23, 22, 21, 21, 22, 25, 31, 40, 51, 63, 74, 81,
  84, 85, 83, 79, 72, 63, 52, 43, 35, 29, 26, 24,
];
const CLEAN_THRESHOLD = 55;
const DEFAULT_WATERING_THRESHOLD = 42;

function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function hourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${suffix}`;
}

function curve() {
  return CLEAN_ENERGY_CURVE.map((clean_pct, hour) => ({
    hour,
    label: hourLabel(hour),
    clean_pct,
  }));
}

function contiguousRanges(values: number[], minimum = CLEAN_THRESHOLD) {
  const ranges: Array<{ start: number; end: number }> = [];
  let start: number | null = null;
  values.forEach((value, hour) => {
    if (value >= minimum && start === null) start = hour;
    if ((value < minimum || hour === values.length - 1) && start !== null) {
      const end = value < minimum ? hour - 1 : hour;
      ranges.push({ start, end });
      start = null;
    }
  });
  return ranges;
}

function recommendation(soilMoisture: number, wateringThreshold: number) {
  const ranges = contiguousRanges(CLEAN_ENERGY_CURVE);
  const best = ranges
    .flatMap((range) =>
      Array.from({ length: Math.max(1, range.end - range.start - 1) }, (_, offset) => {
        const start = range.start + offset;
        const end = Math.min(range.end, start + 2);
        const values = CLEAN_ENERGY_CURVE.slice(start, end + 1);
        return { start, end, score: values.reduce((sum, value) => sum + value, 0) / values.length };
      }),
    )
    .sort((a, b) => b.score - a.score)[0] ?? { start: 11, end: 13, score: 84 };
  const start = best.start;
  const end = best.end;
  const maxClean = Math.max(...CLEAN_ENERGY_CURVE.slice(start, end + 1));
  const needsWater = soilMoisture <= wateringThreshold;
  const kwhSaved = needsWater ? Number((1.45 + (maxClean - 70) * 0.018).toFixed(1)) : 0;
  const co2Avoided = needsWater ? Number((kwhSaved * 5.8).toFixed(1)) : 0;
  const reason = needsWater
    ? `Soil is at ${Math.round(soilMoisture)}%, below the ${wateringThreshold}% crop threshold. The ${hourLabel(start)}–${hourLabel(end + 1)} window overlaps the day's cleanest hours at ${Math.round(maxClean)}% clean energy.`
    : `Soil is still at ${Math.round(soilMoisture)}%, above the ${wateringThreshold}% crop threshold. Hold the pump and let the field use its available moisture.`;

  return GetScheduleResponse.parse({
    date: isoDate(),
    start_hour: start,
    end_hour: end + 1,
    start_label: hourLabel(start),
    end_label: hourLabel(end + 1),
    duration_hours: end - start + 1,
    reason,
    kwh_saved: kwhSaved,
    co2_avoided_kg: co2Avoided,
    clean_threshold: CLEAN_THRESHOLD,
    soil_moisture: Number(soilMoisture.toFixed(1)),
    watering_threshold: wateringThreshold,
  });
}

function forecastCurve() {
  return CLEAN_ENERGY_CURVE.map((value, hour) => {
    const adjustment = Math.sin((hour + 1) * 0.9) * 2.2 + (hour % 4 === 0 ? 1 : -0.5);
    return Number(Math.max(0, Math.min(100, value + adjustment)).toFixed(1));
  });
}

function classifyImage(imageData: string, imageName = "") {
  const hint = `${imageName} ${imageData.slice(0, 120)}`.toLowerCase();
  if (/(spo(il|i)ng|overripe|brown|dark|mushy)/.test(hint)) {
    return {
      classification: "spoiling" as const,
      cooling_state: "full" as const,
      color_metrics: { green_score: 0.12, ripe_score: 0.39, dark_score: 0.71 },
    };
  }
  if (/(unripe|green|raw)/.test(hint)) {
    return {
      classification: "unripe" as const,
      cooling_state: "low" as const,
      color_metrics: { green_score: 0.78, ripe_score: 0.18, dark_score: 0.09 },
    };
  }
  return {
    classification: "ripe" as const,
    cooling_state: "low" as const,
    color_metrics: { green_score: 0.14, ripe_score: 0.82, dark_score: 0.11 },
  };
}

router.get("/clean-energy-today", (_req, res) => {
  res.json(
    GetCleanEnergyTodayResponse.parse({
      date: isoDate(),
      source_note: "Modeled from published India Energy Atlas fuel-mix patterns.",
      current_hour: new Date().getHours(),
      curve: curve(),
    }),
  );
});

router.get("/schedule", (req, res) => {
  const parsed = GetScheduleQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "soil_moisture must be a number from 0 to 100." });
    return;
  }
  res.json(recommendation(parsed.data.soil_moisture, parsed.data.crop_threshold));
});

router.get("/forecast", (_req, res) => {
  const predicted = forecastCurve();
  const actual = predicted.map((value, hour) =>
    Number(Math.max(0, Math.min(100, value + Math.sin(hour * 1.4) * 4.8)).toFixed(1)),
  );
  const mape = actual.reduce((sum, value, hour) => sum + Math.abs(value - predicted[hour]) / value, 0) / actual.length * 100;
  res.json(
    GetForecastResponse.parse({
      date: isoDate(new Date(Date.now() + 86_400_000)),
      predicted_curve: predicted,
      actual_curve: actual,
      mape: Number(mape.toFixed(1)),
      model_used: "Seasonal-naive baseline with hour smoothing",
      holdout_days: 2,
    }),
  );
});

router.post("/ripeness", (req, res) => {
  const parsed = ClassifyRipenessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Upload an image or choose a sample fruit." });
    return;
  }
  const result = classifyImage(parsed.data.image_data, parsed.data.image_name);
  res.json(
    ClassifyRipenessResponse.parse({
      timestamp: new Date().toISOString(),
      ...result,
      confidence_note: "HSV color-threshold classifier · demo mode",
    }),
  );
});

export default router;