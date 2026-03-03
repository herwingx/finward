import { ICON_NAMES } from '@/components/Icon';

/** Icon names supported for categories (used in IconSelector, stored in DB) */
export const VALID_ICONS = ICON_NAMES as readonly string[];

export const FALLBACK_ICON = 'category';

export function getValidIcon(icon: string | undefined | null, fallback = FALLBACK_ICON): string {
  if (!icon) return fallback;
  const n = icon.trim().toLowerCase();
  return VALID_ICONS.includes(n) ? n : fallback;
}

export function isValidIcon(icon: string): boolean {
  return VALID_ICONS.includes(icon?.trim().toLowerCase() || '');
}
