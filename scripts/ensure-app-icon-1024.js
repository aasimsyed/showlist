#!/usr/bin/env node
/**
 * Post-prebuild: copy assets/icon.png into the generated iOS AppIcon.appiconset
 * so the 1024x1024 App Store icon is your exact file. Ensures the icon shows
 * in App Store Connect (Apps list and store) when you upload the build.
 * Run from project root; requires ios/ from expo prebuild.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const iosDir = path.join(projectRoot, 'ios');
const sourceIcon = path.join(projectRoot, 'assets', 'icon.png');

if (!fs.existsSync(sourceIcon)) {
  console.warn('ensure-app-icon-1024: assets/icon.png not found, skipping.');
  process.exit(0);
}

// Find AppIcon.appiconset (e.g. ios/ShowlistAustin/Images.xcassets/AppIcon.appiconset)
let appIconSet = null;
if (fs.existsSync(iosDir)) {
  const topDirs = fs.readdirSync(iosDir);
  for (const d of topDirs) {
    const candidate = path.join(iosDir, d, 'Images.xcassets', 'AppIcon.appiconset');
    if (fs.existsSync(candidate)) {
      appIconSet = candidate;
      break;
    }
  }
}

if (!appIconSet) {
  console.warn('ensure-app-icon-1024: AppIcon.appiconset not found under ios/, skipping.');
  process.exit(0);
}

const contentsPath = path.join(appIconSet, 'Contents.json');
let contents = { images: [], info: { version: 1, author: 'expo' } };
if (fs.existsSync(contentsPath)) {
  try {
    contents = JSON.parse(fs.readFileSync(contentsPath, 'utf8'));
  } catch (e) {
    console.warn('ensure-app-icon-1024: could not parse Contents.json', e.message);
  }
}

const filename1024 = 'App-Icon-1024x1024@1x.png';
const destPath = path.join(appIconSet, filename1024);

// Copy 1024 icon
fs.copyFileSync(sourceIcon, destPath);

// Ensure Contents.json has the App Store iOS well: idiom "ios-marketing", 1024x1024@1x.
// App Store Connect uses this slot for the icon under Apps and on the store.
contents.images = contents.images || [];
const hasIosMarketing = contents.images.some(
  (i) => i.size === '1024x1024' && i.idiom === 'ios-marketing'
);
if (!hasIosMarketing) {
  contents.images.push({
    filename: filename1024,
    idiom: 'ios-marketing',
    scale: '1x',
    size: '1024x1024',
  });
  fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2) + '\n');
}

console.log('ensure-app-icon-1024: copied assets/icon.png to AppIcon (1024x1024 ios-marketing) for App Store.');
