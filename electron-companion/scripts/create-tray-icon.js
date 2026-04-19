/**
 * Create a simple tray icon for the companion app.
 * Run this script to generate the tray-icon.png file.
 *
 * Usage: node scripts/create-tray-icon.js
 *
 * For production, replace with a proper icon designed for each platform:
 * - macOS: 22x22 @1x, 44x44 @2x (template image, monochrome)
 * - Windows: 16x16 ICO
 * - Linux: 22x22 PNG
 */

const fs = require("fs");
const path = require("path");

// Simple 22x22 PNG (1-pixel border circle) as a base64 placeholder
// In production, replace with actual icon assets
const PLACEHOLDER_ICON_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz" +
  "AAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGRSURB" +
  "VDiNtZU9TsNAEIW/WYcUFBQcgQNwAI5AQUFBwRG4AEegpKCg4AgcgCNQUFDgI1BQUOAjUFBQ4CNQ" +
  "UFBQ8CjsOJvYTiJ+aaTd2Zn3ZnZ2VhGBJEmSJEn+F6mqKiJC0zTUdU1d19R1TV3X1HVNVVVUVUVV" +
  "VVlVVWZVVZlVVWVWVZVZVVVmVVWZVVVlVlWVWVVVZlVVmVVVZVZVlVlVVWZVVZlVVWVWVZVZVVVm" +
  "VVWZ/QJJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkuQ/AAAA";

const assetsDir = path.join(__dirname, "..", "assets");
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const iconPath = path.join(assetsDir, "tray-icon.png");
fs.writeFileSync(iconPath, Buffer.from(PLACEHOLDER_ICON_BASE64, "base64"));
console.log(`Tray icon placeholder created at: ${iconPath}`);
console.log("Replace with a proper icon for production use.");
