# Closet Colour — iPhone wardrobe & colour guide

This is a private, installable Progressive Web App (PWA). It works offline once installed and stores wardrobe data on the device.

## What it does
- Saves clothes with photo, category, colour family, brand/shop, notes and favourite status
- Reminds you of your strongest colour families while shopping
- Lets you take a garment photo and gives an approximate colour-family check
- Lets you manually choose a colour for a quick check
- Includes the guidance that cream is wearable, but soft white/oyster generally gives you more contrast
- Exports/imports a wardrobe backup as JSON
- Works offline after the first load

## Important privacy note
There is no server and no account in this version. Wardrobe data and photos are stored in the browser on the device. Export a backup before changing phones, uninstalling, or clearing Safari website data.

## Put it online (needed once so iPhone can install it)
A PWA must be served over HTTPS. Any simple static host works. Two common options are GitHub Pages or Netlify.

### Netlify
1. Unzip this folder on a computer.
2. Sign in to Netlify and use its drag-and-drop deployment for the folder.
3. Open the HTTPS site it gives you on your iPhone.

### GitHub Pages
1. Create a new GitHub repository.
2. Upload all files in this folder, preserving the `icons` folder.
3. Enable GitHub Pages for the repository.
4. Open the Pages HTTPS address on your iPhone.

## Install on iPhone
1. Open the hosted app in Safari.
2. Tap Share.
3. Tap **Add to Home Screen**.
4. Tap **Add**.

It will then launch like a normal app from the Home Screen.

## Notes on the photo colour checker
Shop lighting can shift colours dramatically. The checker samples the centre of the photo and compares it with your saved palette, so treat it as a quick reminder rather than a definitive colour analysis.


## iPhone-friendly GitHub upload
This package is flattened deliberately: all files can be selected and uploaded to the repository root in one step. Do not upload the ZIP itself to GitHub Pages; unzip it first and upload the individual files.
