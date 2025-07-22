export interface ClickableArea {
  id: string;
  name: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  teaser: string;
  detail: string;
  isEditing?: boolean; // Optional field for admin use
}

export interface InteractiveImageProps {
  src: string;
  alt: string;
  clickableAreas: ClickableArea[];
  width: number;
  height: number;
  sizes?: string;
  className?: string;
  onAreaClick?: (area: ClickableArea) => void;
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
  name: string;
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
}
