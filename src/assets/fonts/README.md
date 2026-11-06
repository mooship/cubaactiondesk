# Fonts

Two variable fonts, both under the SIL Open Font License 1.1. The licence for each sits next to its file.

- `big-shoulders-display.woff2`: Big Shoulders Display, weights 700 to 900. Headings, the nav and the wordmark.
- `source-serif-4.woff2`: Source Serif 4, weights 400 to 700. Body text.

Both started as the Latin variable files from Fontsource (`@fontsource-variable/big-shoulders-display` 5.3.0 and
`@fontsource-variable/source-serif-4` 5.3.1). I cut the weight axis down to the range the site uses and saved the
result as WOFF2 with fontTools, keeping only the layout features the site needs:

```sh
fonttools varLib.instancer big-shoulders-display-latin-wght-normal.woff2 wght=700:900 -o bsd.ttf
pyftsubset bsd.ttf --unicodes="*" --layout-features="kern,liga,locl,pnum,tnum" --flavor=woff2 --output-file=big-shoulders-display.woff2

fonttools varLib.instancer source-serif-4-latin-wght-normal.woff2 wght=400:700 -o ss4.ttf
pyftsubset ss4.ttf --unicodes="*" --layout-features="kern,liga,locl,pnum,tnum" --flavor=woff2 --output-file=source-serif-4.woff2
```

Together they come to about 51 KB, inside the 60 KB font budget in `scripts/check-budgets.ts`.
