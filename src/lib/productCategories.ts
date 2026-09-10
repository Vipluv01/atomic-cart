// Deliberately its own module, not re-exported from models/Product.ts:
// that file imports mongoose at the top level, and pulling anything from
// it into a "use client" component (like the category filter pills) drags
// the entire MongoDB driver into the browser bundle and fails the build.
export const PRODUCT_CATEGORIES = ["Keyboards", "Mice", "Docks", "Audio", "Monitors", "Accessories"] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
