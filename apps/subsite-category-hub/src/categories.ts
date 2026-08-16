export type CategoryIcon =
  | "shoe"
  | "shirt"
  | "hanger"
  | "pants"
  | "bag"
  | "watch"
  | "jewelry"
  | "electronics";

export interface CategoryLinkDefinition {
  slug: string;
  title: string;
  description: string;
  icon: CategoryIcon;
}

export const CATEGORY_LINKS = [
  {
    slug: "shoes",
    title: "Shoes & sneakers",
    description: "Profile, sizing and sole details",
    icon: "shoe",
  },
  {
    slug: "tops",
    title: "Hoodies & shirts",
    description: "Measurements, fabric and construction",
    icon: "shirt",
  },
  {
    slug: "outerwear",
    title: "Jackets & outerwear",
    description: "Lining, closures and packed volume",
    icon: "hanger",
  },
  {
    slug: "bottoms",
    title: "Pants & shorts",
    description: "Waist, rise, inseam and material",
    icon: "pants",
  },
  {
    slug: "bags",
    title: "Bags",
    description: "Dimensions, hardware and interior",
    icon: "bag",
  },
  {
    slug: "watches",
    title: "Watches",
    description: "Case size, clasp and close-up details",
    icon: "watch",
  },
  {
    slug: "accessories",
    title: "Accessories & jewelry",
    description: "Scale, finish and inclusions",
    icon: "jewelry",
  },
  {
    slug: "electronics",
    title: "Electronics",
    description: "Specs, plugs and compatibility",
    icon: "electronics",
  },
] as const satisfies readonly CategoryLinkDefinition[];
