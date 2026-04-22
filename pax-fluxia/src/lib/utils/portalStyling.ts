import { normalizePortalGroupId } from "@pax/common";

const PORTAL_GROUP_HEX_COLORS = [
  0x7c3aed,
  0x0ea5e9,
  0x22c55e,
  0xf97316,
  0xec4899,
  0xeab308,
  0x14b8a6,
  0xef4444,
  0x8b5cf6,
  0x10b981,
  0xf59e0b,
  0x3b82f6,
] as const;

const DEFAULT_PORTAL_HEX = 0x6366f1;

function toCssHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function getPortalGroupIndex(portalGroup?: string | null): number | null {
  const normalized = normalizePortalGroupId(portalGroup);
  if (!normalized) {
    return null;
  }

  const index = Number(normalized) - 1;
  return index >= 0 && index < PORTAL_GROUP_HEX_COLORS.length ? index : null;
}

export function getPortalGroupHexColor(portalGroup?: string | null): number {
  const index = getPortalGroupIndex(portalGroup);
  return index === null ? DEFAULT_PORTAL_HEX : PORTAL_GROUP_HEX_COLORS[index]!;
}

export function getPortalGroupCssColor(portalGroup?: string | null): string {
  return toCssHex(getPortalGroupHexColor(portalGroup));
}

export function getPortalGroupLabel(portalGroup?: string | null): string {
  return normalizePortalGroupId(portalGroup) ?? "?";
}
