export const THEME_DEFAULTS = {
  primaryColor: "#4D694E",
  creamColor: "#FFF3D5",
  whiteColor: "#FFFFFF",
};

export const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{6})$/;

export function isHexColor(value) {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value.trim());
}

export function normalizeThemeColors(input) {
  const primaryColor = String(input?.primaryColor ?? "").trim().toUpperCase();
  const creamColor = String(input?.creamColor ?? "").trim().toUpperCase();
  const whiteColor = String(input?.whiteColor ?? "").trim().toUpperCase();

  if (![primaryColor, creamColor, whiteColor].every((color) => HEX_COLOR_PATTERN.test(color))) {
    return null;
  }

  return { primaryColor, creamColor, whiteColor };
}
