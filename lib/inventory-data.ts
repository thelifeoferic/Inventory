import { checklistMinibarSeedItems } from "./minibar-data";
export type LocationDefinition = {
  name: string;
  group: "Shared spaces" | "Guest rooms" | "Residence";
  description: string;
  zones: string[];
  kind: "conex" | "room" | "shared" | "house";
};

export const roomInventoryCategories = ["Permanent Fixtures", "Mini Bar — Basket", "Mini Bar — Fridge", "Guest Amenities"];

const originalLocations: LocationDefinition[] = [
  {
    name: "CONEX",
    group: "Shared spaces",
    description: "",
    zones: ["Room supplies shelf", "Linen shelf", "Tools shelf", "Parts shelf", "Lighting shelf", "Floor stock", "Appliances + table", "Entry"],
    kind: "conex",
  },
  {
    name: "WINDSONG",
    group: "Shared spaces",
    description: "Retail, guest pantry and breakfast service inventory.",
    zones: ["Hardware, Fixtures & Furniture", "Products"],
    kind: "shared",
  },
  {
    name: "GROUNDS",
    group: "Shared spaces",
    description: "Outdoor furniture, poolside equipment, lighting, tools and site features.",
    zones: ["Outdoor furniture", "Lighting", "Tools", "Site features", "Site equipment"],
    kind: "shared",
  },
  {
    name: "POOL ROOM",
    group: "Shared spaces",
    description: "Pool service supplies, water storage and exterior guest amenities.",
    zones: ["Towels", "Sunscreen", "Cups", "Water storage", "Cleaning equipment", "Lost & found"],
    kind: "shared",
  },
  {
    name: "LAUNDRY ROOM",
    group: "Shared spaces",
    description: "Linen, amenities and housekeeping equipment.",
    zones: ["Clean linen", "Soiled linen", "Amenities", "Machines", "Housekeeping cart"],
    kind: "shared",
  },
  {
    name: "HOUSEKEEPING",
    group: "Shared spaces",
    description: "Cleaning supplies, tools, toiletries, linen and room-support inventory.",
    zones: ["Cleaning Supplies", "Cleaning Tools", "Appliance", "Rooms", "Toiletries", "Soft Goods/Linen", "Dog Supplies"],
    kind: "shared",
  },
  {
    name: "LOBBY",
    group: "Shared spaces",
    description: "Front desk, guest beverage service and public-area supplies.",
    zones: ["Desk", "Beverage station", "Restroom stock", "Shelving", "Seating"],
    kind: "shared",
  },
  {
    name: "WREN HOUSE",
    group: "Residence",
    description: "Two-bedroom residence inventory, room by room.",
    zones: ["Kitchen", "Living room", "Bedroom 1", "Bedroom 2", "Bath 1", "Bath 2", "Patio"],
    kind: "house",
  },
  ...Array.from({ length: 12 }, (_, index) => ({
    name: `ROOM ${String(index + 1).padStart(2, "0")}`,
    group: "Guest rooms" as const,
    description: index < 6 ? "Sunset Deluxe King" : index < 11 ? "Sunrise King" : "ADA",
    zones: roomInventoryCategories,
    kind: "room" as const,
  })),
];

export const locations: LocationDefinition[] = originalLocations
  .filter(location => location.name !== "LAUNDRY ROOM")
  .map(location => location.name === "POOL ROOM" ? { ...location, name: "POOL ROOM / WINDSONG BACK STOCK", description: "Windsong back stock, water storage and pool-room inventory." }
    : location.name === "HOUSEKEEPING" ? { ...location, zones: [...location.zones, "Clean linen", "Soiled linen", "Amenities", "Machines", "Housekeeping cart"] } : location)
  .sort((a, b) => {
    const rank = (location: LocationDefinition) => location.name === "WINDSONG" ? 0 : location.name === "HOUSEKEEPING" ? 1 : location.group === "Shared spaces" ? 2 : location.group === "Guest rooms" ? 3 : 4;
    return rank(a) - rank(b);
  });

export const conexPhotos = [
  "IMG_4282.jpg", "IMG_4283.jpg", "IMG_4284.jpg", "IMG_4285.jpg",
  "IMG_4286.jpg", "IMG_4287.jpg", "IMG_4288.jpg", "IMG_4289.jpg",
  "IMG_4290.jpg", "IMG_4291.jpg", "IMG_4292.jpg", "IMG_4293.jpg",
  "IMG_4294.jpg", "IMG_4296.jpg", "IMG_4297.jpg", "IMG_4298.jpg",
  "IMG_4299.jpg", "IMG_4301.jpg", "IMG_4302.jpg", "IMG_4303.jpg",
  "IMG_4304.jpg", "IMG_4305.jpg", "IMG_4306.jpg",
].map((file) => `/conex/${file}`);

const roomMinibarStandard = [
  { name: "Canyon Coffee", unit: "packets", notes: "Known Hotel Wren room amenity. Confirm the room par and physical count." },
  { name: "Bellocq Tea", unit: "sachets", notes: "Known Hotel Wren room amenity. Confirm varieties, room par and physical count." },
];

export const roomMinibarSeedItems = Array.from({ length: 12 }, (_, index) => {
  const space = `ROOM ${String(index + 1).padStart(2, "0")}`;
  return roomMinibarStandard.map((item) => ({
    ...item,
    space,
    zone: "Guest Amenities",
    quantity: 0,
    par: 0,
    status: "Count needed",
    photo: "",
    reorderUrl: "",
  }));
}).flat();

export const seedItems = [
  { name: "Parachute Hospitality Bath Towels", space: "CONEX", zone: "Linen shelf", quantity: 18, par: 24, unit: "towels", status: "Confirmed", photo: "/conex/IMG_4288.jpg", notes: "Quantity confirmed from the carton label. Parachute Home Hospitality bath towel, white." },
  { name: "Amazon Commercial Kitchen Paper Towels", space: "CONEX", zone: "Room supplies shelf", quantity: 10, par: 12, unit: "rolls", status: "Photo estimate", photo: "/conex/IMG_4284.jpg", notes: "Visible roll count from the Conex photo; verify during the first physical count." },
  { name: "PLA 12 oz Cup Sets", space: "CONEX", zone: "Room supplies shelf", quantity: 100, par: 100, unit: "sets", status: "Confirmed", photo: "/conex/IMG_4285.jpg", notes: "Carton label states 100 cups, 100 lids and 100 stirrers." },
  { name: "Mini Stemless Wine Glasses", space: "CONEX", zone: "Room supplies shelf", quantity: 24, par: 24, unit: "glasses", status: "Confirmed", photo: "/conex/IMG_4294.jpg", notes: "Set of 24 confirmed from the box label." },
  { name: "Glass Beverage Dispenser", space: "CONEX", zone: "Room supplies shelf", quantity: 1, par: 1, unit: "each", status: "Confirmed", photo: "/conex/IMG_4290.jpg", notes: "One glass dispenser visible." },
  { name: "Stainless Serving Bowls", space: "CONEX", zone: "Room supplies shelf", quantity: 6, par: 6, unit: "bowls", status: "Photo estimate", photo: "/conex/IMG_4292.jpg", notes: "Nested bowls; confirm the exact count during physical inventory." },
  { name: "Ceramic Bowls", space: "CONEX", zone: "Room supplies shelf", quantity: 3, par: 4, unit: "bowls", status: "Photo estimate", photo: "/conex/IMG_4296.jpg", notes: "Three visible in the photo." },
  { name: "Smooth Mattress Encasements — Queen", space: "CONEX", zone: "Linen shelf", quantity: 6, par: 6, unit: "encasements", status: "Confirmed", photo: "/conex/IMG_4299.jpg", notes: "Quantity taken from handwritten carton label." },
  { name: "Smooth Mattress Encasements — King", space: "CONEX", zone: "Linen shelf", quantity: 4, par: 4, unit: "encasements", status: "Confirmed", photo: "/conex/IMG_4299.jpg", notes: "Quantity taken from handwritten carton label." },
  { name: "Packaged White Linens", space: "CONEX", zone: "Linen shelf", quantity: 0, par: 0, unit: "bundles", status: "Count needed", photo: "/conex/IMG_4298.jpg", notes: "Visible but the package labels do not provide a reliable total." },
  { name: "Cascade Mountain Water Cases", space: "POOL ROOM", zone: "Water storage", quantity: 4, par: 6, unit: "cases", status: "Photo estimate", photo: "/conex/IMG_4306.jpg", notes: "Relocated from the Conex to Pool Room storage. Confirm the current case count." },
  { name: "Mountain Valley Spring Water Cases", space: "POOL ROOM", zone: "Water storage", quantity: 5, par: 6, unit: "cases", status: "Photo estimate", photo: "/conex/IMG_4306.jpg", notes: "Relocated from the Conex to Pool Room storage. Confirm the current case count.", reorderUrl: "https://www.mountainvalleyspring.com/" },
  { name: "Decanters / Bar Glassware Bin", space: "CONEX", zone: "Room supplies shelf", quantity: 1, par: 1, unit: "bin", status: "Count needed", photo: "/conex/IMG_4287.jpg", notes: "Bin is identified; individual pieces still need to be counted." },
  { name: "Serving Equipment Bin", space: "CONEX", zone: "Room supplies shelf", quantity: 1, par: 1, unit: "bin", status: "Count needed", photo: "/conex/IMG_4286.jpg", notes: "Bin contains wood and serving objects; itemize during physical count." },
  { name: "Compostable Bowls / Plates", space: "CONEX", zone: "Room supplies shelf", quantity: 0, par: 0, unit: "pieces", status: "Count needed", photo: "/conex/IMG_4283.jpg", notes: "Multiple stacks are visible; exact count is not legible." },
  { name: "Mini-fridge", space: "CONEX", zone: "Appliances + table", quantity: 1, par: 1, unit: "each", status: "Confirmed", photo: "/conex/IMG_4282.jpg", notes: "Located beside the roll-up entry with the microwave and work table." },
  { name: "Microwave", space: "CONEX", zone: "Appliances + table", quantity: 1, par: 1, unit: "each", status: "Confirmed", photo: "/conex/IMG_4282.jpg", notes: "Located beside the roll-up entry with the mini-fridge and work table." },
  { name: "Conex work table", space: "CONEX", zone: "Appliances + table", quantity: 1, par: 1, unit: "each", status: "Confirmed", photo: "/conex/IMG_4282.jpg", notes: "Work surface beside the roll-up entry." },
  { name: "Light fixtures / lighting", space: "CONEX", zone: "Lighting shelf", quantity: 0, par: 0, unit: "pieces", status: "Count needed", photo: "/conex/IMG_4317.jpg", notes: "Stored on the right side of the three-level rear shelving bay." },
  { name: "Tools", space: "CONEX", zone: "Tools shelf", quantity: 0, par: 0, unit: "pieces", status: "Count needed", photo: "/conex/IMG_4317.jpg", notes: "Stored on the left side of the three-level rear shelving bay." },
  { name: "Electrical, hardware + small parts", space: "CONEX", zone: "Parts shelf", quantity: 0, par: 0, unit: "pieces", status: "Count needed", photo: "/conex/IMG_4317.jpg", notes: "Mixed stock on the back run of the rear shelving bay; itemize during the physical count." },
  ...roomMinibarSeedItems,
  ...checklistMinibarSeedItems,
] as const;
