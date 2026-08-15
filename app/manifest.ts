import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "3 Städ Admin",
    short_name: "3 Städ",
    description: "Bokningar, Strato-inkorg och dagliga notiser.",
    start_url: "/admin",
    display: "standalone",
    background_color: "#eef0ec",
    theme_color: "#17362d",
    icons: [{ src: "/og.png", sizes: "1200x630", type: "image/png" }],
  };
}
