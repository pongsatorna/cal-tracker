# Cal Tracker 🥗📊

A lightweight, mobile-first **Progressive Web Application (PWA)** and **AI-powered fitness ecosystem** for daily calorie and macro-nutrient tracking (Calories, Protein, Carbs, Fat, and Calories Burned).

Designed to run seamlessly on iOS & Android standalone web app mode ("Add to Home Screen"), backed by **Gemini Spark AI** for automated meal photo analysis, **Google Sheets** for data storage, and **Google Apps Script** for backend API endpoints — **100% free with zero monthly server costs!**

---

## 🤖 Gemini Spark AI Integration & Workflow

Logging food and exercise is completely friction-free thanks to **Gemini Spark AI**:

1. **Multimodal Meal & Photo Analysis**:
   - Snap a photo of any meal, product, or prepared dish.
   - **Gemini Spark AI** analyzes the image, identifies the ingredients, and proposes estimated **Calories, Protein, Carbs, and Fat**.
   - Upon your confirmation, the entry is automatically **appended as a new row** directly into your Google Sheet.
2. **AI Cardio & Activity Calculations**:
   - Describe an exercise or cardio session.
   - A custom AI Skill calculates calories burned (`Out`) tailored to your personal profile inputs and appends the row to Google Sheets.
3. **Real-Time Visual PWA Dashboard**:
   - `cal-tracker` connects directly to the same Google Sheet to display real-time daily totals, dynamic progress rings, macro breakdowns, and date navigation.

---

## 🌟 Key Features

- **Dynamic Calorie Progress Ring**:
  - Visual SVG progress ring tracking net daily calories against your goal.
  - **Positive Net Calories**: Fills clockwise starting from 12 o'clock in blue (or red when exceeding target).
  - **Negative Net Calories**: Fills counter-clockwise starting from 12 o'clock in vibrant green.
- **Macro Breakdown & Unit Toggle**:
  - Live progress bars for **Protein**, **Carbs**, and **Fat**.
  - Toggle display units between **Grams (g)** and **Percentage (%) of target**.
- **Interactive Date Navigation**:
  - Weekly horizontal date strip for quick day switching.
  - Full-screen monthly calendar picker modal to inspect any historical date.
- **Hybrid Debounced Selection**:
  - Instant UI highlight, date header, and skeleton shimmer loading feedback on tap.
  - 200ms debounced network requests to optimize Apps Script executions.
  - Monotonic request guard (`currentLoadId`) to reject stale or out-of-order responses during rapid date switching.
- **Target Settings with Grams / % Switch**:
  - Easily configure daily goals in **Grams** or **Percentages** with automatic calorie and ratio calculations.
- **Manual Log Entry & Editing**:
  - Add, edit, or delete logged entries with automatic sheet row synchronization.
- **iOS & Android PWA Ready**:
  - Custom apple-touch-icon, standalone mobile viewport, dark theme (`#14171C`), and smooth touch interactions.

---

## 🏗️ End-to-End System Architecture

```
 ┌─────────────────────────────────────────────────────────────┐
 │            Gemini Spark AI Multimodal Skill                 │
 │ (Photo Analysis, Dish/Product Macro Estimation, Cardio Math) │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Appends New Rows
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                Google Sheets Database ($0/mo)               │
 │                   (Sheets: Log & Targets)                   │
 └──────────────┬──────────────────────────────▲───────────────┘
                │ Reads Log Rows               │ Writes Logs
                │ & Target Goals               │ & Targets
                ▼                              │
 ┌─────────────────────────────────────────────┴───────────────┐
 │               Google Apps Script REST API ($0/mo)           │
 │                     (gg-appscript/code.gs)                  │
 └──────────────────────────────▲──────────────────────────────┘
                                │ HTTP API (?action=...&token=...)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │             Cal Tracker PWA Dashboard ($0/mo)               │
 │                 (Hosted on GitHub Pages)                    │
 └─────────────────────────────────────────────────────────────┘
```

---

## 💰 $0 / Month Serverless Stack

This entire ecosystem runs with **zero monthly subscription or server costs**:

| Component | Technology | Cost |
| :--- | :--- | :--- |
| **AI Intelligence** | Gemini API / Gemini Spark | **$0** (Free Tier) |
| **Database** | Google Sheets | **$0** (Free Google Drive Storage) |
| **Backend API** | Google Apps Script (`code.gs`) | **$0** (Free Cloud Execution) |
| **Web Dashboard** | GitHub Pages (`cal-tracker`) | **$0** (Free Static PWA Hosting) |

---

## 📁 Repository Structure

```
cal-tracker/
├── index.html            # Main PWA entry point (~150 lines)
├── manifest.json         # PWA Web App Manifest
├── README.md             # Project documentation
├── package.json          # Test runner config
├── css/
│   └── styles.css        # Extracted CSS styles & variables
├── js/
│   └── app.js            # Extracted JS state, rendering & API logic
├── icons/                # App icon assets (16x16, 32x32, 180x180, 192x192, 512x512)
├── tests/
│   └── app.test.js       # Zero-dependency automated unit test suite
├── gg-appscript/
│   └── code.gs           # Google Apps Script backend Web App API code
└── docs/                 # System documentation & plans
```

---

## 🚀 Setup & Deployment Guide

### 1. Google Sheets Setup

Create a new Google Sheet containing two tabs:

#### **Tab 1: `Log`**
Headers in Row 1:
`Date` | `Time` | `Type` | `Method` | `Item` | `Calories` | `Protein` | `Carbs` | `Fat` | `Notes`

#### **Tab 2: `Targets`**
Headers in Row 1:
`Nutrient` | `Goal`
- Row 2: `Calorie` | `2070`
- Row 3: `Protein` | `140`
- Row 4: `Carb` | `220`
- Row 5: `Fat` | `70`

---

### 2. Google Apps Script Backend Deployment

1. Open [Google Apps Script](https://script.google.com/) and create a new project.
2. Paste the contents of [`gg-appscript/code.gs`](file:///Users/superneung/Documents/dev/projects/cal-tracker/gg-appscript/code.gs).
3. Update the configuration constants at the top of `code.gs`:
   ```javascript
   const TOKEN = 'YOUR_SECRET_TOKEN';
   const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';
   const TZ = 'Asia/Bangkok';
   ```
4. Click **Deploy > New deployment**.
5. Select **Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
6. Copy the generated Web App URL.

---

### 3. Frontend Configuration

In `index.html`, set your deployment parameters in the query string or URL configuration:
- `GAS_URL`: Your Apps Script Web App URL.
- `TOKEN`: Your matching secret token.

---

### 4. Running Unit Tests

Run the automated test suite locally anytime with:
```bash
npm test
```
Or directly using Node.js:
```bash
node --test tests/app.test.js
```

---

## 🤝 Contributing & License

Feel free to submit issues, pull requests, or feature requests!

License: MIT
