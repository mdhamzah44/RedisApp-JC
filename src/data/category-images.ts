import beds from "@/assets/cat-beds.jpg";
import kitchen from "@/assets/cat-kitchen.jpg";
import lighting from "@/assets/cat-lighting.jpg";
import seating from "@/assets/cat-seating.jpg";
import storage from "@/assets/cat-storage.jpg";
import tables from "@/assets/cat-tables.jpg";
import textiles from "@/assets/cat-textiles.jpg";
import wall from "@/assets/cat-wall.jpg";

/** Fallback artwork used when a category row in the database has no product photo yet. */
export const categoryFallbackImages: Record<string, string> = {
  "beds-bedroom": beds,
  beds: beds,
  bedroom: beds,
  seating: seating,
  chairs: seating,
  tables: tables,
  lighting: lighting,
  lamps: lighting,
  "wall-decor": wall,
  decor: wall,
  textiles: textiles,
  storage: storage,
  "kitchen-dining": kitchen,
  kitchen: kitchen,
  dining: kitchen,
};

export const genericFallbackImages: string[] = [
  beds,
  seating,
  tables,
  lighting,
  wall,
  textiles,
  storage,
  kitchen,
];
