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
  gm_notes?: string;
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
  display_name?: string; // public-facing name when real name is hidden
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
  nameHidden?: boolean;
  hide_name?: boolean; // legacy/alt flag in data
  notes?: UserNote[]; // Reuse the same note structure as quests
  gm_notes?: string;
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
  gif?: string;
  player?: string | null; // UUID of the user who plays this character
  gm_notes?: string;
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
  image?: string;
  gm_notes?: string;
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

export interface UserNote {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

export interface Quest {
  id: string;
  name: string;
  notes: UserNote[] | string[]; // Support legacy string format
  status: string;
  gm_notes?: string;
  tagged_npcs?: string[];
  tagged_locations?: string[];
}

export interface Item {
  id: string;
  name: string;
  category: string;
  pronunciation?: string;
  type_tag?: string;
  description?: string;
  properties?: string;
  image?: string;
  hidden?: boolean;
  gm_notes?: string;
  notes?: UserNote[];
  tagged_recaps?: string[];
  tagged_npcs?: string[];
  tagged_pcs?: string[];
  tagged_locations?: string[];
}

export interface SessionRecap {
  date: string;
  title: string;
  recap: string;
  id?: string; // unique id for editing
  author?: string; // uid of creator
  notes?: UserNote[];
  tagged_npcs?: string[];
  tagged_locations?: string[];
  tagged_quests?: string[];
  tagged_items?: string[];
}
