import React from 'react';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  AtSign,
  Badge,
  BarChart2,
  BarChart3,
  Bell,
  Bitcoin,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarX,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  CloudDownload,
  CreditCard,
  DollarSign,
  Eye,
  EyeOff,
  FolderX,
  Gift,
  History,
  Info,
  KeyRound,
  List,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  LogOut,
  Mail,
  MailCheck,
  PartyPopper,
  Pencil,
  PieChart,
  PiggyBank,
  Plus,
  Receipt,
  Recycle,
  Repeat,
  Search,
  SearchX,
  Send,
  Settings,
  Tag,
  Trash2,
  User,
  TrendingUp,
  UserPlus,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * Maps Material Symbols / legacy icon names to Lucide components.
 * Single source of truth for icon usage across the app.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  // Actions
  add: Plus,
  remove: ArrowDown,
  close: X,
  delete: Trash2,
  edit: Pencil,
  check: Check,
  send: Send,
  search: Search,

  // Navigation
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  arrow_downward: ArrowDown,
  arrow_upward: ArrowUp,
  arrow_outward: ArrowUpRight,
  expand_more: ChevronDown,
  chevron_right: ChevronRight,
  move_down: ArrowDownToLine,
  unfold_more: ChevronsUpDown,

  // Finance & Accounts
  account_balance_wallet: Wallet,
  account_balance: Landmark,
  credit_card: CreditCard,
  payments: Wallet,
  attach_money: DollarSign,
  savings: PiggyBank,
  receipt_long: Receipt,
  receipt: Receipt,
  trending_up: TrendingUp,

  // UI & Status
  check_circle: CircleCheck,
  error: CircleAlert,
  warning: CircleAlert,
  info: Info,

  // Calendar & Time
  calendar_today: Calendar,
  calendar_month: Calendar,
  event: Calendar,
  event_repeat: Repeat,
  event_busy: CalendarX,
  calendar_off: CalendarX,
  history: History,

  // Auth & Security
  lock: KeyRound,
  lock_reset: KeyRound,
  lock_outline: KeyRound,
  vpn_key: KeyRound,
  alternate_email: AtSign,
  logout: LogOut,
  person_add: UserPlus,
  badge: Badge,
  mail: Mail,

  // Misc
  visibility: Eye,
  visibility_off: EyeOff,
  settings: Settings,
  category: Tag,
  category_search: Search,
  swap_horiz: ArrowLeftRight,
  sync_alt: ArrowLeftRight,
  notifications: Bell,
  notifications_active: Bell,
  photo_camera: Camera,
  mark_email_read: MailCheck,
  auto_delete: Trash2,
  recycling: Recycle,
  folder_off: FolderX,
  search_off: SearchX,
  data_exploration: LineChart,
  analytics: BarChart3,
  bar_chart: BarChart2,
  pie_chart: PieChart,
  celebration: PartyPopper,

  // Category icons (Material -> Lucide equivalents)
  restaurant: Receipt,
  local_cafe: Receipt,
  fastfood: Receipt,
  lunch_dining: Receipt,
  local_bar: Receipt,
  kitchen: Receipt,
  paid: DollarSign,
  wallet: Wallet,
  shopping_cart: Receipt,
  shopping_bag: Receipt,
  store: Receipt,
  directions_car: Receipt,
  flight: Receipt,
  train: Receipt,
  home: Landmark,
  apartment: Landmark,
  movie: Receipt,
  medical_services: CircleCheck,
  school: Receipt,
  work: Landmark,
  pets: CircleCheck,
  star: CircleCheck,
  favorite: CircleCheck,
  trending_down: ArrowDown,
  currency_exchange: DollarSign,
  help: Info,
  person: Tag,
  group: Tag,
  email: MailCheck,
  phone: Bell,
  schedule: Calendar,
  share: Send,
  download: ArrowDown,
  upload: ArrowUp,
  refresh: Repeat,
  sync: Repeat,
  cloud: Tag,
  folder: Tag,
  description: Receipt,
  show_chart: BarChart2,
  assessment: BarChart3,
  currency_bitcoin: Bitcoin,
  home_work: Building2,
  call_made: ArrowUpRight,
  call_received: ArrowDownLeft,
  handshake: CircleCheck,
  redeem: Gift,
  done_all: CircleCheck,
  credit_card_off: CreditCard,
  login: LogOut,
  link: ChevronRight,
  add_chart: BarChart2,
  priority_high: CircleAlert,
  dangerous: Trash2,
  space_dashboard: LayoutDashboard,
  grid_view: LayoutGrid,
  confirmation_number: Gift,
  list_alt: List,
  donut_large: PieChart,
  credit_score: CreditCard,
  monetization_on: DollarSign,
  account_circle: User,
  monitoring: LineChart,
  candlestick_chart: TrendingUp,
  cloud_download: CloudDownload,
  delete_sweep: Trash2,
};

const FALLBACK_ICON = Tag;

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Enable hover/active scale animation (default: true) */
  animated?: boolean;
}

function resolveIcon(name: string): LucideIcon {
  const normalized = name?.trim().toLowerCase() || '';
  return ICON_MAP[normalized] ?? FALLBACK_ICON;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  className = '',
  style,
  animated = true,
}) => {
  const LucideIcon = resolveIcon(name);
  const animClass = animated ? 'transition-transform duration-200 hover:scale-110 active:scale-95' : '';
  return (
    <LucideIcon
      size={size}
      className={`shrink-0 ${animClass} ${className}`}
      style={style}
      strokeWidth={2}
      aria-hidden
    />
  );
};

/** Get valid icon name or fallback */
function getValidIcon(name: string | undefined | null, fallback = 'category'): string {
  if (!name) return fallback;
  const n = name.trim().toLowerCase();
  return ICON_MAP[n] ? n : fallback;
}

/** List of icon names for IconSelector (stored in DB for categories) */
export const ICON_NAMES = Object.keys(ICON_MAP);
