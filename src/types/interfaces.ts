export interface Location {
  id: string;
  name: string;
  pronunciation?: string;
  mapImg?: string;
  x?: number; // percentage
  y?: number; // percentage
  width?: number; // percentage
  height?: number; // percentage
  teaser: string;
  detail: string;
  isEditing?: boolean; // Optional field for admin use
  locations?: Location[];
}

export interface InteractiveImageProps {
  src: string;
  alt: string;
  locations: Location[];
  width: number;
  height: number;
  sizes?: string;
  className?: string;
  onAreaClick?: (area: Location) => void;
  selectedLocationId?: string | null; // ID of the location with open sidebar
}

export interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  description: string;
}

export interface SideNavigationProps {
  className?: string;
}

export interface NPC {
  id: string;
  name?: string;
  aka?: string;
  pronunciation: string;
  race: string;
  gender: string;
  location: string;
  status: string;
  factions?: string[];
  description: string;
  background?: string;
  personality?: string;
  image?: string; // optional
  hidden?: boolean;
  nameHidden?: boolean
}

export interface PC {
  id: string;
  name: string;
  nickname?: string;
  race: string;
  hometown: string;
  status: string;
  factions?: string[];
  image?: string; // optional
  class: string;
}
export interface Faction {
  id: string;
  name: string;
  pronunciation: string;
  type: string;
  description: string;
  location: string;
  status: string;
  goals: string;
  background?: string;
  relationships?: {
    faction: string;
    status: string;
    description?: string;
  }[];
  image?:string;
}

export interface CalendarWeekday {
  type: string;
  name: string;
  pronunciation?: string;
  id: string;
}
export interface CalendarMonth {
  type: string;
  name: string;
  pronunciation?: string;
  length: number;
  id: string;
  interval: number;
  offset: number;
}
export interface CalendarMoon {
  name: string;
  cycle: number;
  offset: number;
  faceColor: string;
  shadowColor: string;
  id: string;
}
export interface CalendarLeapDay {
  [key: string]: unknown;
}
export interface CalendarEra {
  [key: string]: unknown;
}
export interface CalendarCategory {
  id: string;
  color: string;
  name: string;
}
export interface CalendarEvent {
  name: string;
  description: string;
  date: { month: number; day: number | number[]; year: number };
  id: string;
  note: string | null;
  category: string | null;
  sort: { timestamp: number; order: string };
  type: string;
  end?: { month: number; day: number | number[]; year: number };
  dmOnly?: boolean;
}
export interface CalendarData {
  name: string;
  description: string;
  id: string;
  showIntercalarySeparately: boolean;
  static: {
    incrementDay: boolean;
    firstWeekDay: number;
    overflow: boolean;
    weekdays: CalendarWeekday[];
    months: CalendarMonth[];
    moons: CalendarMoon[];
    displayMoons: boolean;
    displayDayNumber: boolean;
    leapDays: CalendarLeapDay[];
    eras: CalendarEra[];
    padMonths: number;
    padDays: number;
  };
  current: { day: number; month: number; year: number };
  events: CalendarEvent[];
  categories: CalendarCategory[];
}
