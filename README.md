# PiXfourge

Raise your Creality SpacePi X4 dryer's temperature limit from 90°C to 95°C and give it your own boot screen. You don't install anything or run any code. Open the page, drop in a file, download a new one.

**Open the tool: https://drxen00.github.io/PiXfourge/**

Everything runs inside your browser tab. Your firmware file is never uploaded anywhere.

> **Alpha firmware, no warranty.** The firmware's author says long-term testing at high temperature isn't finished. Stay nearby for your first runs and keep the dryer off flammable surfaces. Read [Is it safe?](#is-it-safe) before you flash.

## What you need

- A **Creality SpacePi X4**, the dual-chamber dryer. This is not for the X4L, which has different hardware and firmware.
- The Creality beta firmware file **`v0.2.9_3.1_cspx4.lcd`** (4,161,192 bytes). This is *not* the retail firmware on Creality's download page. That one is a different build and can't be patched. If you don't have the beta yet, ask [@gunfuzled](https://x.com/gunfuzled) where to get it.
- A microSD card and a way to plug it into your computer.
- Any modern browser.

## How to use it

1. **Open the tool** at the link above.
2. **Drop in the beta file.** You should get green checks. If you get a red one, see [Troubleshooting](#troubleshooting).
3. **Pick a boot screen.** Use the original, or choose your own image. The meter shows how much of the available space it uses.
4. **Tick the warning box, press Build firmware, then Download the .lcd file.** It takes a few seconds.
5. **Put it on the dryer:**
   1. Format the microSD card as **FAT32**. If it asks for an allocation unit size, choose 4096 bytes.
   2. Copy the new `.lcd` file to the card's top-level folder. It must be the **only** `.lcd` on the card, so don't put the original beta next to it.
   3. Turn the dryer off, put the card in the display's slot, then turn it on.
   4. Wait for the update to finish. When it's done, remove the card, and turn the dryer off and on again if it asks.
6. **Check it worked.** The About screen should say `V3.0.1_0`, and the temperature keypad should say "Input range: 45~95".

### Using it offline

Download `index.html` from this repo and open it in your browser. Everything it needs is inside that one file. The only thing that won't load offline is the web font, and the page falls back to your system fonts.

### Going back to stock

Flash the original `v0.2.9_3.1_cspx4.lcd`, or a retail firmware file from [Creality](https://www.creality.com/download/creality-spacepi-x4), the same way as above.

## Custom boot screens

Any PNG, JPG, GIF or WebP works. PiXfourge resizes it to the display's 320×240 and stores it in a fixed block of unused space in the firmware: **61,056 bytes**.

- **Flat colors fit easily.** Logos, line art and text use little space. Photos, gradients and anything dithered use a lot.
- **The meter tells you.** If it goes red, the build is blocked so nothing gets overwritten. Raise **Simplify colors**, or use a simpler image.
- **Sizing:** *Fit* shows the whole image, *Fill* crops the edges, and *Use as-is* needs exactly 320×240.
- **The warning line always shows.** "ALPHA FIRMWARE: NO WARRANTY, EXPRESS OR IMPLIED" is drawn across the bottom edge for the 2 seconds the boot screen is up. The bottom 16 pixels are left clear for it in *Fit* mode.

## Troubleshooting

| What you see | What it means |
| --- | --- |
| "File size is … bytes. The beta is exactly 4,161,192 bytes." | That's not the beta file. Retail and older firmware can't be patched. |
| "This isn't the v0.2.9_3.1_cspx4 beta" | The file is the right size but the layout is different. Use the original beta from Creality. |
| "This file already has the 95°C patch" | You dropped in a file that's already been patched. Use the original beta. |
| "Fingerprint differs from the known beta" (amber) | The file isn't byte-for-byte the one the patch was written against, but every patch location still checks out, so it should be fine. |
| Boot screen meter is red | The image needs too much space. Raise **Simplify colors** or use a simpler image. |
| The dryer doesn't start the update | Check the card is FAT32, the file ends in `.lcd`, and it's the only `.lcd` on the card. |

## Is it safe?

It changes two limits and nothing else important:

- **The temperature limit** goes from 90°C to 95°C, in both the display firmware and the heater-controller firmware.
- **The boot screen and the version number** (V3.0.1_0).

According to the original project's analysis, the over-temperature and sensor protections stay switched on and are calculated from the setpoint, so they move up with it. At 95°C the heater over-temperature fault (E01) trips at 114.5°C, and the sensor-fault cutoff (E02) is fixed at 140°C. That analysis is the author's; it hasn't been independently checked here. The details are in the [technical README](docs/CFW_TECHNICAL_README.md).

What nobody has finished is long-term testing at these temperatures: wear on the chamber, the spools, and the sensors. Treat your first runs like a test.

### Verify your build

If you use the original boot screen, the file you download should have this SHA-256:

```
9edddccb3a0b775de31e440a51aa5b0674d9ed0941ab5d90c48d6ef38efe3054
```

That's when it's built from a beta with SHA-256 `012e12bc4cc7cd86b4f0226d3a4624b83e01a9770085327af31e2f809f91435a`. It's byte-for-byte identical to what the original command-line script produces.

## Thank the person who did the hard part

<img src="assets/confuzled_logo.jpg" alt="confuzled's logo" width="96" align="right">

The reverse-engineering, the temperature limits and the patch are all the work of **confuzled** ([@gunfuzled](https://x.com/gunfuzled) on X, [confuzled-dev](https://github.com/confuzled-dev) on GitHub). PiXfourge is only a friendlier front door. If it saved you time, these are his affiliate links, so he earns a commission when you buy through them:

- [Siraya Tech](https://siraya.tech/?sca_ref=9774016.2Uf9iip746&sca_source=Confuzled)
- [Polymaker](https://shop.polymaker.com/CONFUZLED)
- [VoidSpec](https://voidspec.com/aff/1/) — use code **POOPMAN** for 10% off

## Credits and notes

- The patch logic, picture format and checksums are ported from [confuzled-dev/SpacePiX4_cfw](https://github.com/confuzled-dev/SpacePiX4_cfw), and this repo keeps its full commit history. As of this writing, that project has no license file.
- PiXfourge is an unofficial community tool and isn't affiliated with Creality. Provided as is, with no warranty.

## For developers

| Path | What it is |
| --- | --- |
| `index.html` | The whole tool: page, styles, patcher and the default boot screen in one file. |
| `docs/CFW_TECHNICAL_README.md` | The original project README: patch table, offsets, firmware history. |
| `docs/` | The original reverse-engineering notes. |
| `scripts/build_3.0.1_0.js` | The original command-line builder. `node scripts/build_3.0.1_0.js` still works if you put the beta in `firmware/`. |
| `assets/default_splash.png` | The 320×240 default boot screen, before the warning line is added. |
| `tests/verify-site.cjs` | Drives `index.html` in a headless browser and checks the output against the reference build. |

To run the test: `npm i playwright && npx playwright install chromium`, then `node tests/verify-site.cjs path/to/v0.2.9_3.1_cspx4.lcd`.
