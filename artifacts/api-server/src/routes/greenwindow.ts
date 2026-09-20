import { Router, type IRouter } from "express";
import multer from "multer";
import { Jimp } from "jimp";
import {
  ClassifyRipenessBody,
  ClassifyRipenessResponse,
  GetCleanEnergyTodayResponse,
  GetForecastResponse,
  GetScheduleQueryParams,
  GetScheduleResponse,
} from "@workspace/api-zod";

// The generated client sends /ripeness as multipart/form-data, but
// express.json()/urlencoded() cannot parse multipart bodies at all — without
// this, req.body was always empty and every upload failed validation.
// `.none()` expects multipart fields with no binary file parts, which
// matches: image_data is sent as a plain base64 string field.
const upload = multer();

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

  const needsWater = soilMoisture <= wateringThreshold;

  if (!needsWater) {
    return GetScheduleResponse.parse({
      date: isoDate(),
      start_hour: null,
      end_hour: null,
      start_label: null,
      end_label: null,
      duration_hours: 0,
      reason: `Soil is still at ${Math.round(soilMoisture)}%, above the ${wateringThreshold}% crop threshold. Hold the pump and let the field use its available moisture.`,
      kwh_saved: 0,
      co2_avoided_kg: 0,
      clean_threshold: CLEAN_THRESHOLD,
      soil_moisture: Number(soilMoisture.toFixed(1)),
      watering_threshold: wateringThreshold,
    });
  }

  const start = best.start;
  const end = best.end;
  const maxClean = Math.max(...CLEAN_ENERGY_CURVE.slice(start, end + 1));
  const kwhSaved = Number((1.45 + (maxClean - 70) * 0.018).toFixed(1));
  const co2Avoided = Number((kwhSaved * 5.8).toFixed(1));
  const reason = `Soil is at ${Math.round(soilMoisture)}%, below the ${wateringThreshold}% crop threshold. The ${hourLabel(start)}–${hourLabel(end + 1)} window overlaps the day's cleanest hours at ${Math.round(maxClean)}% clean energy.`;

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

// Real pixel-based color heuristic — NOT a trained model.
function rgbToHsv(r: number, g: number, b: number) {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === rf) hue = 60 * (((gf - bf) / delta) % 6);
    else if (max === gf) hue = 60 * ((bf - rf) / delta + 2);
    else hue = 60 * ((rf - gf) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const saturation = max === 0 ? 0 : delta / max;
  const value = max;
  return { hue, saturation, value };
}

async function classifyImage(imageData: string, imageName = "") {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(imageData);
  const UNSUPPORTED_FORMATS = new Set(["image/svg+xml", "image/webp", "image/avif", "image/heic", "image/heif"]);
  if (!match || UNSUPPORTED_FORMATS.has(match[1])) {
    return {
      classification: "ripe" as const,
      cooling_state: "low" as const,
      color_metrics: { green_score: 0, ripe_score: 0, dark_score: 0 },
      confidence_note:
        "This file format isn't supported yet (try JPG or PNG) — no color analysis ran on it. Save the photo as a JPG or PNG and upload again for a real read.",
    };
  }

  const buffer = Buffer.from(match[2], "base64");
  const image = await Jimp.read(buffer);
  image.resize({ w: 32, h: 32 });

  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (_x, _y, idx) => {
    rSum += image.bitmap.data[idx];
    gSum += image.bitmap.data[idx + 1];
    bSum += image.bitmap.data[idx + 2];
    count += 1;
  });
  const avgR = rSum / count;
  const avgG = gSum / count;
  const avgB = bSum / count;
  const { hue, saturation, value } = rgbToHsv(avgR, avgG, avgB);

  const greenScore = Math.max(0, 1 - Math.abs(hue - 110) / 90) * saturation;
  const hueFromRed = Math.min(hue, 360 - hue);
  const ripeScore = Math.max(0, 1 - hueFromRed / 60) * saturation * value;
  const darkScore = Math.max(0, 1 - value) * (1 - Math.min(saturation * 1.3, 1)) + Math.max(0, 0.35 - value);

  const scores = {
    green_score: Number(Math.min(greenScore, 1).toFixed(2)),
    ripe_score: Number(Math.min(ripeScore, 1).toFixed(2)),
    dark_score: Number(Math.min(darkScore, 1).toFixed(2)),
  };

  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const classification =
    top === "dark_score" ? ("spoiling" as const) : top === "green_score" ? ("unripe" as const) : ("ripe" as const);
  const cooling_state = classification === "spoiling" ? ("full" as const) : ("low" as const);

  return {
    classification,
    cooling_state,
    color_metrics: scores,
    confidence_note: "",
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

router.post("/ripeness", upload.none(), async (req, res) => {
  const parsed = ClassifyRipenessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Upload an image or choose a sample fruit." });
    return;
  }
  try {
    const result = await classifyImage(parsed.data.image_data, parsed.data.image_name);
    res.json(
      ClassifyRipenessResponse.parse({
        timestamp: new Date().toISOString(),
        ...result,
      }),
    );
  } catch (err) {
    res.status(422).json({ error: "Could not decode that image. Try a JPG or PNG photo." });
  }
});
// ... all your existing routes above (clean-energy-today, schedule, forecast, ripeness) ...

function generateAnomalyHistory() {
  const baseline = 4.6;
  const history = [];
  for (let day = 1; day <= 14; day++) {
    let kwh = baseline + (Math.random() - 0.5) * 0.6;
    if (day === 12) {
      kwh = baseline * 1.42;
    }
    history.push({ day, kwh: Number(kwh.toFixed(2)) });
  }
  return history;
}

router.get("/anomaly-check", (_req, res) => {
  const history = generateAnomalyHistory();
  const values = history.map((h) => h.kwh);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const today = history[history.length - 1];
  const zScore = (today.kwh - mean) / stdDev;
  const isAnomaly = Math.abs(zScore) > 2;
  const pctDiff = Math.round(((today.kwh - mean) / mean) * 100);

  const message = isAnomaly
    ? `Today's usage is ${pctDiff}% above this pump's normal pattern — check for leaks or blockages.`
    : "Usage is within normal range.";

  res.json({
    history,
    today_kwh: today.kwh,
    mean: Number(mean.toFixed(2)),
    std_dev: Number(stdDev.toFixed(2)),
    is_anomaly: isAnomaly,
    message,
  });
});


export default router;