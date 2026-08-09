import beds from "@/assets/cat-beds.webp";
import kitchen from "@/assets/cat-kitchen.webp";
import lighting from "@/assets/cat-lighting.webp";
import seating from "@/assets/cat-seating.webp";
import storage from "@/assets/cat-storage.webp";
import tables from "@/assets/cat-tables.webp";
import textiles from "@/assets/cat-textiles.webp";
import wall from "@/assets/cat-wall.webp";

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

/**
 * Tiny (~150–250 byte) inline base64 blur placeholders, one per category
 * image above, generated at build time from the same source photos. Used by
 * <AdaptiveImage> to paint something immediately instead of a blank box,
 * with zero extra network requests.
 */
export const categoryImageLqip: Record<string, string> = {
  [beds]:
    "data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAACwBACdASoYABIAPu1qr1CppaQiqAqpMB2JZQAALnR5/bd0KsFzyHRxaCmjuMWgAP7nF66V+h8HpAqTSCBRWRHe6lwwEvfnz3m+1J6TOqReVLclZHTe9zeDrQ9soBjB4Qm974ayV8jo7B0rhyrlDRbjbw0vqzwHexp4rISbS/AAAAAA",
  [kitchen]:
    "data:image/webp;base64,UklGRp4AAABXRUJQVlA4IJIAAACwBACdASoYABIAPu1qrlCppaQiqAqpMB2JQBYj8BA1P8n4w0mswCT4TQaH+XcAAP7tRK36kzJT9hU1xZnb8I3FAMHnTzh9NuMcfHI0JIi/RUtp+7wqULqD4TDS3HY5Rxo8Wg5FnBJPpZ4hbCsGQC6LmPh/iK2Ckw3s9xBK0ZvrxQnkluF5beHtOILXxxluPBAAAA==",
  [lighting]:
    "data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAACQBACdASoYABIAPu1sq1EppiOiqAqpMB2JYgCdMuNwABAcvoXTRLTYg5MwKuAA/uQgGm+XkDvg6tfsEDq4vSqbcNKG8AgHjoVRhDWUnPwO1N9nLbP2yxnw7E23VWcPU365UdfQbsqqStwee8ee0hzqXMdIuMwXDAA=",
  [seating]:
    "data:image/webp;base64,UklGRqIAAABXRUJQVlA4IJYAAACwBACdASoYABIAPu1ur1IppiQiqAgBMB2JQBOmaYg1QB4J1baPw0HOiu4btrgAAP7tUIJbUKZhZixNDr/NcqGwpPjVf1QBh8nOYFxSdXytqCI2NNq9tiH6tgvFqJ7gj+vKpivL1+3r1s3MaJlKFJFC8KlSxjtn1AH1CnEcZhNxR/xkbhlBmsM2HFfL1tGDjYpWbL8gAAA=",
  [storage]:
    "data:image/webp;base64,UklGRq4AAABXRUJQVlA4IKIAAAAQBQCdASoYABIAPu1orVCppaQiqAqpMB2JYgC7L9SA0eWkUQnEIIkHdnkQZXwlUR1AAP7DnJUrWF00RsbefFodCc0rsRrGuvV4HrPZqzcI2r3/eVn4n6Rfj7tsOCEMUaAJ70uC4t43z2WURgC+0zdbv6ZDAezQ0rHsy6sOenN2T3Kc8VwQHCvRkn2Tr0H4BB1nl6DuJVmzyGxNq0BcDP0AAAA=",
  [tables]:
    "data:image/webp;base64,UklGRqQAAABXRUJQVlA4IJgAAADQBACdASoYABIAPu1sq1EppaOiqAqpMB2JQBYj5ohTApv/36wa4LpnYqRg6SzyAAD+3nOwdNWnExMmZDWfPFdlN231I/xiKXNaukHaqi+BPucklM/NWEZhZcMY+bG0IoLf8xWnreCcJieAT4/jdiuyXCzqFCAPpN4KCHgdMaMUVg+oceE/RSpgjQjxr3iMHzd1m5RkW/OAAA==",
  [textiles]:
    "data:image/webp;base64,UklGRoYAAABXRUJQVlA4IHoAAAAQBACdASoYABIAPu1mqk2ppaQpMAgBMB2JQBOmcdhp01KVb1sMuklREAD+6oK3o7tQ0E1x7G13HZ3uRjoWghJExNLvRix6cWBvN1Dg0Dw+bRiLki4yki6Phyh8/wNsTDw9jgGlPr5Crp18+8b3Xa3B1pLl2IwtyeAAAA==",
  [wall]:
    "data:image/webp;base64,UklGRqIAAABXRUJQVlA4IJYAAAAQBQCdASoYABIAPu1oqk+ppaOiKA1RMB2JZQDA3A9rfGOrjHO+50XG9DgaeZM3+sAAAP6vmxb8TMuqtVIj9E5PSI9OCizFBbV+Wjr6YrT0t/pWycYTSTowTWlHI7P5dt9jNOwy6iMG64msi0/fbMoKL2cHZNz1xDVmOxNr8k8/dTu+Ooj3hrsSuGcDBBVIsjenFYFAAAA=",
};
