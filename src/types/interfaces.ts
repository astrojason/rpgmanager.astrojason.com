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
  faction?: string;
  description: string;
  background?: string;
  personality?: string;
  image: string;
  hidden?: boolean;
  nameHidden?: boolean
}

export interface Faction {
  id: string;
  name: string;
  pronunciation: string;
  type: string;
  description: string;
  location: string;
  status: string;
  members: string[];
  goals: string;
  background?: string;
  relationships?: {
    faction: string;
    status: string;
    description?: string;
  }[];
}
