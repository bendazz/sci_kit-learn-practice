# Linear Regression Practice (Frontend)

A minimal, framework-free web app to help students practice fitting a simple linear regression model of the form:

	y = w0 + w1·x

The app:
- Plots a reproducible 2D dataset (x, y) with light, uncluttered UI
- Lets you adjust w0 (intercept) and w1 (slope) via sliders and see the line update
- Shows Mean Squared Error (MSE) for the current line vs. the data
- Provides a button to download the dataset as CSV for offline work in scikit‑learn

## Files

- `index.html` — Entry point (loads Chart.js from CDN)
- `styles.css` — Light theme and simple layout
- `script.js` — Dataset generation, chart setup, slider handlers, CSV export

## Use

1. Open `index.html` in your browser.
2. Move the sliders for `w0` and `w1` to adjust the line y = w0 + w1·x.
3. Watch the chart update and the MSE value change.
4. Click “Download CSV” to save the dataset (`x,y`) and use it in Python with scikit‑learn to find the optimal parameters.

No build or server is required; it’s a static page that works locally.

## Notes

- The dataset is generated deterministically with a fixed seed so all students get the same data by default.
- Chart rendering uses Chart.js (via CDN) and vanilla JavaScript. No frameworks are used.