import type { Location } from "@/types/interfaces";

const EXTERIOR_LABEL = /^\s*(?:(\*\*|__)\s*Exterior\s*:?\s*\1\s*:?|Exterior\s*:)\s*/i;

/** Drops a leading "Exterior:" label (bold or plain) from a vault-derived short description. */
export function stripExteriorLabel(teaser?: string | null): string {
  if (!teaser) return "";
  return teaser.replace(EXTERIOR_LABEL, "");
}

/** Finds a location by id at any depth of the tree. */
export function findLocationById(locations: Location[], id: string): Location | null {
  for (const loc of locations) {
    if (String(loc.id) === id) return loc;
    const nested = loc.locations ? findLocationById(loc.locations, id) : null;
    if (nested) return nested;
  }
  return null;
}

export interface FlatLocation {
  location: Location;
  depth: number;
}

/** Depth-first flattening of the location tree, preserving order. */
export function flattenLocations(locations: Location[], depth = 0): FlatLocation[] {
  return locations.flatMap(location => [
    { location, depth },
    ...(location.locations ? flattenLocations(location.locations, depth + 1) : []),
  ]);
}
