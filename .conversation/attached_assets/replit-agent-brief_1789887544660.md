# REPLIT AGENT BUILD BRIEF — "GreenWindow" (Clean-Energy-Aware Irrigation & Storage Scheduler)

---

## 1. APP OVERVIEW

**App name:** GreenWindow
**One-line description:** An AI scheduling assistant that tells farmers exactly when to run irrigation pumps and cold-storage cooling — only when it's both clean-energy-available and actually needed — instead of running on a fixed clock.

**Core problem it solves:** Indian farmers run pumps and storage cooling on fixed schedules or free/subsidized power with zero regard for grid cleanliness or real crop/produce need. This wastes energy, overdraws groundwater, and doesn't stop preventable spoilage. GreenWindow applies one decision rule — "run only when clean AND needed" — to both irrigation and storage cooling.

**Target user:** Smallholder and mid-size Indian farmers, especially those with solar pump connections (PM-KUSUM), plus agri-extension officers and DISCOMs interested in demand-side load shifting.

---

## 2. FULL FEATURE LIST

Build in this exact priority order. **Hard stop at each checkpoint — do not move to the next tier until the current one works end-to-end.**

### TIER 1 — Must work, build first (target: ~2.5 hrs)
1. **Grid clean-energy curve (mock/derived data)** — a 24-hour hourly series of "% clean energy" for the current day, shaped like a real solar-heavy grid (low at night, peak midday 10am–4pm, dips morning/evening). Ship as a static JSON/CSV seeded on load, clearly labeled "Modeled from India Energy Atlas fuel-mix patterns."
2. **Soil moisture input via slider** — no physical sensor. A UI slider (0–100%) the user drags to simulate current soil moisture. Default value auto-decays over a simulated timeline (see #4).
3. **Scheduling Engine (the core IP)** — a rule/scoring function: `recommend_window(clean_energy_curve, soil_moisture, crop_threshold)` → returns the best contiguous hour-range where clean_energy% is above a threshold AND soil_moisture is below the crop's watering threshold. Output: start hour, end hour, and a plain-language reason string.
4. **Simulated soil moisture decay** — a small function that decays moisture over time (exponential decay + random noise), so the dashboard shows a believable curve without a sensor. Clearly labeled "Simulated — hardware-ready for capacitive soil sensor input."
5. **Savings calculator** — compares scheduled run vs. a fixed 6am baseline, outputs kWh saved and kg CO₂ avoided (use the ~4.6 kWh/day and ~440 kg CO₂/season figures as your validated per-pump baseline, scaled to the demo).
6. **Farmer alert mock** — a rendered SMS-style card: "Best irrigation window today: 11 AM–2 PM" in English + one regional language (Hindi/Marathi), no real SMS API needed.

### TIER 2 — Forecasting layer (target: ~1 hr, hard cap)
7. **Next-day clean-energy forecast** — train ONE simple model (see Tech Stack) on a historical/synthetic hourly clean-% dataset. Do not overbuild: a seasonal-naive baseline ("tomorrow = same hour yesterday, smoothed") compared against one slightly better model (e.g., linear regression on hour-of-day + day-of-week) is enough.
8. **Honest MAPE display** — compute and display Mean Absolute Percentage Error on a held-out slice of the data, labeled clearly (e.g., "Forecast accuracy: 8.2% MAPE on holdout test"). Never claim the forecast is perfect.

### TIER 3 — Storage/OpenCV module (target: ~1–1.5 hrs, SCOPE DOWN AGGRESSIVELY)
9. **Ripeness detection — simple color-threshold OpenCV, NOT a trained deep model.** Use HSV color-space thresholding on tomatoes (or any single fruit you have sample images/webcam for): classify into `unripe` (green-dominant), `ripe` (red/orange-dominant), `overripe/spoiling` (dark/brown patches or low saturation). This is doable in under an hour with `cv2.inRange()` masks — do NOT attempt to train a CNN, you don't have time.
10. **Storage cooling toggle** — if ripeness = "spoiling risk," the dashboard shows "Full cooling triggered" vs. default "Variable/low cooling" state. This is just a rule reacting to the OpenCV output — no real refrigeration hardware needed.
11. **Upload or webcam capture** for one sample image to run through the classifier live during the demo — this is your OpenCV proof-of-life moment.

### NICE-TO-HAVE — only if Tier 1–3 finish with 30+ min to spare
12. Anomaly flag on pump energy use (mocked: "This pump used 40% more energy than its normal pattern — check for leaks").
13. Multi-day history view of savings.
14. Toggle between "grid-tied" and "solar (PM-KUSUM)" farmer profile, changing the copy on why the window matters (cost savings framing for solar).

**Cut without hesitation if time runs short:** anomaly detection, multi-day history, anything requiring a real database beyond local JSON/SQLite.

---

## 3. TECH STACK

Optimized for **fast to build + impressive to judges**, not maximal complexity.

- **Frontend:** React + Vite + TailwindCSS + shadcn/ui components + Recharts (for the clean-energy timeline chart) + Framer Motion (for subtle transitions on the recommended-window highlight)
- **Backend:** Python + FastAPI (needed for OpenCV and simple ML; also fine for the scheduling logic and forecast endpoint)
- **ML/Forecasting:** scikit-learn (LinearRegression or RandomForestRegressor — nothing heavier) + pandas for the time series
- **Computer Vision:** OpenCV (`opencv-python`) — HSV threshold masks only, no deep learning framework needed
- **Data storage:** SQLite (via SQLAlchemy) or even flat JSON files — do not use Postgres/Supabase, it's unnecessary overhead for 6 hours
- **APIs:**
  - Open-Meteo (`https://api.open-meteo.com/v1/forecast`) — free, no API key, for real temperature/humidity if you want to derive a soil-moisture-adjacent signal instead of pure simulation (optional, Tier 3+ only)
  - No paid or rate-limited APIs. Everything else is mocked/synthetic and labeled as such.
- **Deployment:** Replit's built-in run/deploy — no external hosting needed for the demo

---

## 4. PAGES & USER FLOW

**Single-page app, one primary dashboard + one modal.** Do not build multi-page navigation — it adds friction for zero judging benefit.

### Page 1: Dashboard (the entire app)
- **Header:** "GreenWindow" logo/name + one-line tagline
- **Section A — Clean Energy Timeline:** 24-hour horizontal bar/strip, color-coded green (clean) to amber/red (coal-heavy), current hour marked
- **Section B — Soil Moisture Panel:** live decaying moisture % + draggable slider to override
- **Section C — Recommended Window Card:** large, prominent — shows the computed best hour-range, the "why" reasoning string, and the kWh/CO₂ savings vs. fixed schedule
- **Section D — Farmer Alert Preview:** the mock SMS card
- **Section E — Forecast Panel:** tomorrow's predicted clean-energy curve + MAPE badge
- **Section F — Storage Module:** image upload/webcam button → runs OpenCV classifier → shows ripeness result + cooling state toggle

### Modal: "How it works"
- Triggered by an info icon in the header
- Shows the one-line decision rule and the system architecture in plain language — this is your fallback if a judge wants the pitch without you talking

**Navigation:** none needed beyond scrolling — everything lives on one screen so a judge sees the whole system in one glance.

---

## 5. UI & DESIGN INSTRUCTIONS

- **Color scheme:** Earthy-tech palette — deep green (#1B4332) primary, amber/gold (#E9C46A) for warnings/coal-heavy hours, soft cream/off-white background (#FAF9F6), avoid pure white. Clean energy = green, coal-heavy = amber/red gradient on the timeline strip.
- **Fonts:** Inter or Manrope for UI text (clean, modern, free on Google Fonts), a slightly heavier weight for numbers/stats (savings figures should look like "hero numbers")
- **Layout style:** Card-based dashboard, generous whitespace, rounded corners (12–16px radius), soft shadows — should look like a modern SaaS product, not a hackathon prototype
- **Key visual (the one that matters most):** The 24-hour clean-energy timeline strip is your single most important UI element. Make it wide, color-gradient-filled, with the recommended window highlighted by a distinct outline/glow, and the current hour marked with a vertical indicator line. This is the visual that makes the backend logic legible in two seconds — invest disproportionate polish here.
- **Interactions/animations:** When the soil moisture slider moves, animate the recommended window sliding/updating in real time (Framer Motion, 200–300ms transition) — this live reactivity is your best demo moment, make it smooth and instant, no loading spinners on this interaction.
- **Numbers as hero elements:** kWh saved, kg CO₂ avoided, MAPE % — render these large and bold, like a stats dashboard, not buried in paragraph text.

---

## 6. DATA & APIS

### Data models
```
CleanEnergyHour {
  hour: int (0-23)
  clean_pct: float (0-100)
  date: string
}

SoilMoistureReading {
  timestamp: datetime
  moisture_pct: float
  simulated: bool (always true for demo)
}

ScheduleRecommendation {
  date: string
  start_hour: int
  end_hour: int
  reason: string
  kwh_saved: float
  co2_avoided_kg: float
}

ForecastResult {
  date: string
  predicted_curve: list[float]  // 24 values
  mape: float
  model_used: string
}

RipenessResult {
  timestamp: datetime
  classification: "unripe" | "ripe" | "spoiling"
  confidence_note: string  // e.g. "color-threshold classifier"
  cooling_state: "low" | "full"
}
```

### APIs
- **Open-Meteo** (optional, Tier 3+): `GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m` — no key required. Use only if time allows a more grounded moisture-decay model.
- No other external APIs required. India Energy Atlas has no simple public real-time API for hackathon use — **do not attempt to scrape it live**; use a static seeded dataset shaped to match its documented published patterns, and say so on the UI ("Modeled from published India Energy Atlas fuel-mix data").

### Mock/seed data to pre-populate
- A 24-value `clean_pct` array shaped like a real solar-heavy day: low (~20-30%) from midnight–6am, ramping up 6am–10am, peak (~70-85%) 10am–4pm, ramping down 4pm–8pm, low again overnight.
- 7–14 days of historical hourly clean-% data (can be the same daily shape + random noise) to train the Tier 2 forecast model and compute MAPE.
- 3–5 sample fruit images (tomatoes ideal) at different ripeness stages for the OpenCV demo, stored in `/assets/sample_fruit/` so the demo doesn't depend on a working webcam at judging time.

---

## 7. STEP-BY-STEP BUILD INSTRUCTIONS FOR REPLIT AGENT

Follow in exact order. Do not skip ahead. Report back after each numbered step before continuing.

1. Scaffold a new Replit project: React + Vite frontend, Python FastAPI backend, single repo with `/frontend` and `/backend` folders.
2. Set up FastAPI backend with CORS enabled for local frontend dev. Create empty route stubs for: `/api/clean-energy-today`, `/api/schedule`, `/api/forecast`, `/api/ripeness` (POST with image upload).
3. Build the mock clean-energy dataset generator (Python function producing the 24-hour shaped curve + 14 days of history) and wire it to `/api/clean-energy-today` and store history in SQLite or a JSON file.
4. Implement the scheduling engine function `recommend_window()` taking clean-energy curve + soil moisture + threshold, returning best window + reason string. Wire to `/api/schedule`, accepting soil_moisture as a query param.
5. Implement the savings calculator (kWh + CO₂ vs fixed baseline) inside the same `/api/schedule` response.
6. Build the React dashboard shell: header, and empty card sections for A–F as described in Section 4.
7. Build Section A (clean-energy timeline strip) using Recharts or a custom SVG/div-based bar strip, colored by clean_pct value, pulling from `/api/clean-energy-today`.
8. Build Section B (soil moisture slider + simulated decay curve) as a React state + a `useEffect` interval that decays the value over time, with manual slider override.
9. Wire slider changes to call `/api/schedule` and update Section C (recommended window card) live, with the Framer Motion transition on window changes.
10. Build Section D (mock SMS card) — static component rendering the current recommendation as an SMS-style UI block in English + Hindi/Marathi.
11. Implement the Tier 2 forecast: train a simple scikit-learn model (LinearRegression on hour + day-of-week features, or seasonal-naive baseline) on the 14-day mock history, hold out the last 2 days, compute MAPE, expose via `/api/forecast`. Build Section E to display the predicted curve + MAPE badge.
12. Implement the Tier 3 OpenCV ripeness classifier: HSV threshold-based function classifying an uploaded image into unripe/ripe/spoiling. Wire to `/api/ripeness` (accepts image upload). Build Section F with an upload button + result display + cooling-state toggle reacting to the classification.
13. Pre-load 3–5 sample fruit images into the frontend as clickable "try sample" buttons so the demo works even if webcam access fails on the judging machine.
14. Polish pass: apply the color scheme, fonts, card styling, and rounded corners globally. Add the "How it works" modal with the one-line decision rule.
15. Test the full flow end-to-end at least twice: load dashboard → drag soil slider → watch window update → view forecast → upload sample fruit image → see ripeness + cooling state change. Fix anything that breaks silently or shows a loading spinner longer than 1 second.
16. Add fallback/error handling: if any API call fails, show cached/default data instead of a blank screen or error message — the demo must never show a crash.
