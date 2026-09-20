# Annadata-GreenWindow
# GreenWindow — Energy-Aware Irrigation & Storage Scheduler

**Built for HackDay 1.0 — "Tech for a Better Tomorrow"**

## The problem

Grid-connected irrigation pumps in India typically run whenever power happens to be available, not when the grid is actually running on clean energy or when the crop genuinely needs water. This wastes electricity, water, and pushes irrigation load onto dirtier, coal-heavy hours by accident rather than by design.

Separately, farm-gate cold storage units usually run cooling at a constant rate regardless of how close produce actually is to spoiling — wasting energy on batches that don't need heavy cooling yet, while sometimes catching spoilage too late anyway.

## Our solution

GreenWindow combines two signals that are normally never looked at together — **how clean the grid is right now** and **what the crop or stored produce actually needs** — to recommend smarter timing for two energy-intensive farm operations: irrigation and cold storage cooling, and to alert the farmer directly when action is needed.

## Features

- **Clean-energy-aware irrigation scheduling** — reads a modeled clean-energy curve (based on published India Energy Atlas fuel-mix patterns) and a soil-moisture threshold, and recommends the best irrigation window: one that's both low-carbon and actually needed. Shows estimated kWh saved and CO₂ avoided versus running at a random hour.
- **Next-day forecast card** — a seasonal-naive baseline projection of tomorrow's clean-energy curve, shown alongside a modeled comparison curve with an error metric (MAPE).
- **Storage module — ripeness-aware cooling** — upload a photo (or use a sample) of stored produce; the app runs a real pixel-level color analysis (average hue/saturation/brightness in HSV space) to classify the batch as unripe, ripe, or spoiling, and recommends cooling intensity (low vs. full) accordingly.
- **Bilingual email alerts** — sends a farmer-facing advisory email (via SMTP/Nodemailer) with the irrigation recommendation or "no watering needed" status, written in both English and Hindi/Marathi, including crop, soil moisture, threshold, and the recommended clean-energy window.

## What's real vs. what's a stated assumption

- The clean-energy curve is **modeled from published patterns**, not a live real-time grid feed.
- The ripeness classifier is a **lightweight average-color heuristic**, not a trained machine learning model — a genuine analysis of the real image, but not lab-grade accuracy.
- The forecast's accuracy number (MAPE) illustrates the intended feature; it is not backtested against real historical holdout data in this build.
- Email alerts require valid SMTP credentials (see setup below) to actually send.

## Tech stack

- **Frontend:** React + TypeScript
- **Backend:** Express (Node.js) + TypeScript
- **Image processing:** Jimp (pixel-level color analysis)
- **File uploads:** Multer (multipart/form-data handling)
- **Email:** Nodemailer over SMTP (Gmail or custom SMTP server)
- **Schema/API contract:** OpenAPI spec with generated Zod validation + React Query client (via Orval)

## Setup
pnpm install
Set these environment variables for email alerts to work (in `artifacts/api-server`):
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_HOST=smtp.gmail.com # optional, defaults to Gmail
SMTP_PORT=465 # optional
Run each package:
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_HOST=smtp.gmail.com # optional, defaults to Gmail
SMTP_PORT=465 # optional

Run each package:
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_HOST=smtp.gmail.com # optional, defaults to Gmail
SMTP_PORT=465 # optional
Run each package:
pnpm run dev


## Why this approach

Rather than reinventing weather forecasting or building a full trained CV model in a single build window, GreenWindow combines existing, honestly-scoped signals — a grid fuel-mix pattern and real pixel data from an uploaded photo — into one coherent scheduling decision, with a direct, real communication channel (email) to act on it.

## Demo Video
https://drive.google.com/drive/folders/1O7MJH6XTR75RLJXtqg4mamkHzMaOeoOZ?usp=drive_link
