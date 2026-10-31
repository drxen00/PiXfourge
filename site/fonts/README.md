# Embedded fonts

Latin-subset woff2 files from the Fontsource packages `@fontsource/bricolage-grotesque`
(weights 600, 800) and `@fontsource/figtree` (weights 400, 500, 600).
Both typefaces are licensed under the SIL Open Font License 1.1 (https://openfontlicense.org).
`site/build.py` embeds them into `index.html` as base64 so the page makes no network requests.
