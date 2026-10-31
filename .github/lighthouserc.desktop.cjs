// Lighthouse CI, desktop profile. Same pages and assertions as the mobile config (see lighthouserc.cjs for why
// the robots.txt audit is skipped), with Lighthouse's desktop preset.
const mobile = require("./lighthouserc.cjs");

module.exports = {
  ci: {
    ...mobile.ci,
    collect: {
      ...mobile.ci.collect,
      settings: { ...mobile.ci.collect.settings, preset: "desktop" },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/desktop" },
  },
};
