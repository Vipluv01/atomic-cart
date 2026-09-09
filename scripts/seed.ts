import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "../src/lib/models/Product";

const SAMPLE_PRODUCTS = [
  {
    slug: "mechanical-keyboard",
    name: "CyberDeck 75% Mechanical Keyboard",
    description: "Hot-swappable gasket-mounted mechanical keyboard with linear tactile switches and RGB backlighting.",
    priceCents: 12999,
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop",
    stock: 15,
  },
  {
    slug: "wireless-mouse",
    name: "Precision Ergonomic Wireless Mouse",
    description: "Ergonomic dual-mode wireless mouse with a high-precision 4000 DPI optical sensor and quiet clicks.",
    priceCents: 4999,
    imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop",
    stock: 24,
  },
  {
    slug: "usb-c-hub",
    name: "Atomic 7-in-1 Thunderbolt USB-C Dock",
    description: "Aluminum 7-in-1 hub featuring 4K 60Hz HDMI, dual SD card readers, and 100W Power Delivery.",
    priceCents: 6499,
    imageUrl: "https://picsum.photos/seed/usb-c-hub/800/800",
    stock: 8,
  },
  {
    slug: "desk-lamp",
    name: "Smart Monitor Light Bar & LED Lamp",
    description: "Screenbar monitor light with auto-dimming ambient sensor and touch controls to reduce eye strain.",
    priceCents: 5499,
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop",
    stock: 12,
  },
  {
    slug: "studio-headphones",
    name: "Pro-Audio Wireless ANC Headphones",
    description: "Active noise canceling studio wireless headphones with custom 40mm drivers and 30-hour battery life.",
    priceCents: 18999,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop",
    stock: 10,
  },
  {
    slug: "desk-mat",
    name: "Minimalist Felt Wool Desk Mat",
    description: "Premium anti-slip Merino wool felt desk pad designed for optimal mouse tracking and workspace aesthetics.",
    priceCents: 3499,
    imageUrl: "https://picsum.photos/seed/desk-mat/800/800",
    stock: 18,
  },
  {
    slug: "wireless-charger",
    name: "Magnetic 3-in-1 Wireless Stand",
    description: "Fast charging stand for phone, smartwatch, and wireless earbuds with weighted anodized base.",
    priceCents: 7999,
    imageUrl: "https://images.unsplash.com/photo-1615526675159-e248c3021d3f?w=800&auto=format&fit=crop",
    stock: 5,
  },
  {
    slug: "ultrawide-monitor",
    name: "Curved 34-inch 4K Studio Monitor",
    description: "UltraWide 144Hz IPS display with 99% DCI-P3 color accuracy, USB-C single cable connectivity, and height stand.",
    priceCents: 59999,
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop",
    stock: 3,
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(uri);

  for (const product of SAMPLE_PRODUCTS) {
    await Product.updateOne({ slug: product.slug }, { $set: product }, { upsert: true });
  }

  console.log(`Seeded ${SAMPLE_PRODUCTS.length} products.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
