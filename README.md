# Cal Tracker 🥗📊

A lightweight, mobile-first **Progressive Web Application (PWA)** for daily calorie and macro-nutrient tracking (Calories, Protein, Carbs, Fat, and Calories Burned).

Built with pure Vanilla JavaScript and CSS, designed to run seamlessly on iOS & Android standalone web app mode ("Add to Home Screen"), backed by a Google Apps Script REST API and Google Sheets data store.

---

## 🌟 Key Features

- **Dynamic Calorie Progress Ring**:
  - Visual SVG progress ring tracking net daily calories against your goal.
  - **Positive Net Calories**: Fills clockwise starting from 12 o'clock in blue (or red when exceeding target).
  - **Negative Net Calories**: Fills counter-clockwise starting from 12 o'clock in vibrant green.
- **Macro Breakdown & Toggle**:
  - Live progress bars for **Protein**, **Carbs**, and **Fat**.
  - Toggle display units between **Grams (g)** and **Percentage (%) of target**.
- **Interactive Date Navigation**:
  - Weekly horizontal date strip for quick day switching.
  - Full-screen monthly calendar picker modal to inspect any historical date.
- **Hybrid Debounced Selection**:
  - Instant UI highlight, date header, and skeleton shimmer loading feedback on tap.
  - 200ms debounced network requests to optimize Apps Script executions.
  - Monotonic request guard (`currentLoadId`) to reject stale or out-of-order responses during rapid date switching.
- **Manual Log Entry & Settings**:
  - Add food/calorie intake (`In`) or exercise/burn (`Out`).
  - Edit or delete logged entries with automatic sheet row synchronization.
  - Settings panel to configure daily targets (Calories, Protein, Carbs, Fat).
- **iOS & Android PWA Ready**:
  - Custom apple-touch-icon, standalone mobile viewport, dark theme (`#14171C`), and smooth touch interactions.

---

## 🏗️ Architecture & Tech Stack

```
 ┌─────────────────────────────────────────────────┐
 │               PWA Mobile Web App                │
 │         (index.html - HTML5 / CSS3 / JS)        │
 └────────────────────────┬────────────────────────┘
                          │
                          │ HTTP GET/POST API Requests
                          │ (?action=...&token=...)
                          ▼
 ┌─────────────────────────────────────────────────┐
 │           Google Apps Script API                │
 │          (gg-appscript/code.gs)                 │
 └────────────────────────┬────────────────────────┘
                          │
                          │ Google Apps Script SpreadsheetApp API
                          ▼
 ┌─────────────────────────────────────────────────┐
 │               Google Sheets Database            │
 │             (Sheets: Log & Targets)             │
 └─────────────────────────────────────────────────┘
```

- **Frontend**: Single-file Vanilla JS web app (`index.html`) with zero heavy framework dependencies.
- **Fonts**: Manrope, Bebas Neue, JetBrains Mono via Google Fonts.
- **Backend Service**: Google Apps Script (`gg-appscript/code.gs`) deployed as a Web App.
- **Database**: Google Sheets (`Log` and `Targets` sheets).
- **Authentication**: Token-authenticated API parameters.

---

## 📁 Repository Structure

```
cal-tracker/
├── index.html            # Main PWA frontend web application
├── manifest.json         # PWA Web App Manifest
├── icons/                # App icon assets (16x16, 32x32, 180x180, 192x192, 512x512)
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

## 🤝 Contributing & License

Feel free to submit issues, pull requests, or feature requests!

License: MIT
