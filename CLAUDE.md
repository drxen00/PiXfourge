# Pi-Xfourge: notes for Claude Code

Pi-Xfourge is a single-file browser tool that patches Creality's SpacePi X4 beta firmware
(`v0.2.9_3.1_cspx4.lcd`) so the dryer's maximum temperature is 95°C (factory firmware stops at
85°C, the beta at 90°C), with a custom boot screen. It is a friendlier front door to
confuzled-dev's reverse-engineering work in https://github.com/confuzled-dev/SpacePiX4_cfw, and this
repo keeps that project's full history. Display name: **Pi-Xfourge**. Repo slug: **PiXfourge**
(keep it; the GitHub Pages URL is `https://drxen00.github.io/PiXfourge/`).

## Layout

- `index.html`: the whole tool (page, CSS, patcher, file checker, embedded fonts and images).
  **Generated. Do not edit it by hand.**
- `site/index.template.html`: the real source of the page. Edit this, then run
  `python3 site/build.py` (standard library only). `python3 site/build.py --check` fails if
  `index.html` is stale; CI runs it.
- `site/fonts/`, `site/logo_small.jpg`, `assets/default_splash.png`: embedded into the page as base64.
- `scripts/build_3.0.1_0.js`: the original command-line builder by confuzled-dev. It is the reference
  implementation; the page's patcher is a port of it. `build.py` also pulls its 5x7 font table.
- `docs/CFW_TECHNICAL_README.md`: the original README (patch table, offsets, firmware history).
- `assets/banner.svg`, `warning.svg`, `social-preview.svg/.png`: README and repo graphics.
- `tests/verify-site.cjs`: headless-browser test of the real page. It runs the page and the reference
  script on the same input and requires byte-identical output. `tests/make-fixture.cjs` makes the
  synthetic stand-in for the beta it uses by default (not real firmware; never flash it).
- `tests/check-static.cjs`: no-browser check that the page's script parses and nothing loads from outside
  (only `<a href>` links may point outside).

## Commands

- Rebuild the page: `python3 site/build.py`
- Static checks: `npm run check` (or `make check`).
- Test: `npm ci && npx playwright install chromium`, then `npm test` (synthetic beta, what CI runs) or
  `node tests/verify-site.cjs /path/to/v0.2.9_3.1_cspx4.lcd` (real beta, also checks the SHA below).
  The synthetic run proves the page matches the reference script; only the real beta proves both are right.
- Reference outputs: the beta's SHA-256 is
  `012e12bc4cc7cd86b4f0226d3a4624b83e01a9770085327af31e2f809f91435a`. Built with the default boot
  screen, the output must be byte-identical to `node scripts/build_3.0.1_0.js` and have SHA-256
  `9edddccb3a0b775de31e440a51aa5b0674d9ed0941ab5d90c48d6ef38efe3054`.

## Key facts

- Firmware image: 4,161,192 bytes. MCU section at `0x3F256C`. Picture table at `0x054A31`, 24 bytes
  per entry. Pic 81 (the boot screen) is repointed into unused zero padding at `0x301180`, which runs
  to `0x310000` (61,056 bytes). Exceeding that overwrites the code section, so the page blocks it.
- Patches: UI max temp `u32` at `0x310054` (90 to 95); MCU `MOVS R5,#90` at `MCU+0x18DE` and
  `CMP R2,#90` at `MCU+0x18F4` (to 95); MCU version tuple at `MCU+0x49C0` (0.2.9 to 3.0.1); About-screen
  strings; then four checksums recomputed in order (MCU `0x08`, header 1 `0xC4`, header 2 `0x18C`, UI
  master at `MCU-4` XOR `0x66`).
- The checksum algorithm is verified: the stock beta's stored checksums pass it, so the page's
  "Check any firmware file" box can detect damaged or half-patched files.
- According to the original analysis, fault E01 trips at setpoint + 19.5°C (114.5°C at 95°C) and E02 at a
  fixed 140°C. That analysis is the author's and has not been independently verified.

## Rules to keep

1. **Only offer 95°C.** Do not add higher limits (the author is working toward 100 to 110°C and an
   annealing mode) until he releases validated builds. Raising the setpoint also shrinks the margin to the
   fixed 140°C E02 cutoff.
2. **Keep the safety messaging prominent:** the hazard-striped warning at the top of the page and README,
   the required acknowledgment checkbox, and the always-drawn "ALPHA FIRMWARE: NO WARRANTY, EXPRESS OR
   IMPLIED" line on the boot screen.
3. **Output must stay identical to the reference script** for the default boot screen. Re-run the test
   after any change to the patcher, encoder or checksum code.
4. **The page makes no network requests** (fonts are embedded). CI enforces this with
   `tests/check-static.cjs` and the browser test.
5. **Never commit firmware `.lcd` files.** They are Creality's and are gitignored.
6. **Do not write text in confuzled's voice, or put words in his mouth.** The README talks about him in
   the third person, modestly. His logo and his three affiliate links (Siraya Tech, Polymaker, VoidSpec,
   with code POOPMAN under VoidSpec) are shown with his name and labeled as his referral links.
7. **Do not say where to get the beta file** until the author wants that listed. The page and README
   currently say to ask @gunfuzled.
8. The upstream project has no license file. Do not add one on his behalf.

## Status and open items

- Live: GitHub Pages is enabled (branch `main`, root). Repo settings (About description, website,
  topics, social-preview image from `assets/social-preview.png`) are managed by hand in the GitHub UI;
  they can't be changed from a Claude session. Suggested About text: "Drag-and-drop 95°C firmware patcher
  for the Creality SpacePi X4 dryer. Runs in your browser, nothing to install. Built on confuzled-dev's
  SpacePiX4_cfw." Topics: creality, spacepi-x4, filament-dryer, 3d-printing, firmware, custom-firmware,
  firmware-patcher, browser-tool.
- **Not yet tested on real hardware.** The owner hasn't flashed a build to a real X4 yet. Once he has,
  confirm the README's "check it worked" step (About screen says `V3.0.1_0`, keypad says
  "Input range: 45~95") and fix the README if anything differs. A photo of the About screen would be a
  good addition.
- Waiting on the author (confuzled-dev) to approve the logo and referral links, to add a license, and
  to say whether and where the beta file may be listed.
- Known typo in his README (corrected in `docs/CFW_TECHNICAL_README.md`): the Pic 81 descriptor is at
  `0x0551CD`, not `0x0551E5`.
- Ideas, not started: bundle a hardware photo and verification screenshots in the README.
- The Dockerfile has Node 22 for the CLI builder. Node and the pip step were tested; the apt packages
  (`binwalk`, `radare2`) couldn't be, because the Claude session's network blocks Debian mirrors.
- `docs/BINARY_MAP.md`, `MEMORY_BANK.md` and `LLM_PROMPT_BOOK.md` are the author's notes on older firmware,
  labeled as such. Their offsets (e.g. picture table `0x0581F1`) don't apply to the beta.
