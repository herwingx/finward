export const VALID_ICONS = [
  'category', 'paid', 'attach_money', 'savings', 'account_balance', 'credit_card', 'payments', 'trending_up', 'receipt_long', 'currency_exchange', 'wallet',
  'restaurant', 'local_cafe', 'fastfood', 'lunch_dining', 'local_bar', 'liquor', 'kitchen', 'bakery_dining', 'icecream',
  'shopping_cart', 'shopping_bag', 'store', 'sell', 'percent', 'card_giftcard', 'checkroom', 'diamond',
  'directions_car', 'flight', 'train', 'directions_bus', 'local_taxi', 'local_gas_station', 'ev_station', 'local_parking', 'two_wheeler', 'directions_boat',
  'home', 'apartment', 'cottage', 'water_drop', 'lightbulb', 'bolt', 'wifi', 'phone_iphone', 'propane', 'mop', 'bed', 'chair', 'router',
  'movie', 'theaters', 'sports_esports', 'music_note', 'headphones', 'casino', 'stadium', 'sports_soccer', 'pool', 'travel_explore',
  'medical_services', 'fitness_center', 'spa', 'medication', 'local_pharmacy', 'dentistry', 'psychology', 'monitor_heart',
  'school', 'menu_book', 'science', 'backpack', 'work', 'engineering', 'business_center', 'laptop_mac', 'print',
  'pets', 'family_restroom', 'child_care', 'cake', 'celebration', 'content_cut', 'local_laundry_service', 'build', 'construction', 'local_shipping', 'gavel',
  'star', 'favorite', 'check_circle', 'error', 'warning', 'info', 'help', 'settings', 'person', 'group',
  'email', 'phone', 'location_on', 'schedule', 'event', 'calendar_today', 'notifications', 'search', 'add', 'remove',
  'edit', 'delete', 'share', 'download', 'upload', 'refresh', 'sync', 'cloud', 'folder', 'description',
  'trending_down', 'show_chart', 'bar_chart', 'pie_chart', 'analytics', 'assessment', 'price_check', 'request_quote',
  'handshake', 'volunteer_activism', 'redeem'
] as const;

export const FALLBACK_ICON = 'category';

export function getValidIcon(icon: string | undefined | null, fallback = FALLBACK_ICON): string {
  if (!icon) return fallback;
  if ((VALID_ICONS as readonly string[]).includes(icon)) return icon;
  return fallback;
}

export function isValidIcon(icon: string): boolean {
  return (VALID_ICONS as readonly string[]).includes(icon);
}
