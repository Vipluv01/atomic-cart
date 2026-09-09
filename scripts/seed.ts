import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "../src/lib/models/Product";

const SAMPLE_PRODUCTS = [
  {
    slug: "mechanical-keyboard",
    name: "Mechanical Keyboard",
    description: "Hot-swappable 75% mechanical keyboard with tactile switches.",
    priceCents: 8999,
    imageUrl: "https://picsum.photos/seed/keyboard/600/600",
    stock: 12,
  },
  {
    slug: "wireless-mouse",
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse with a 4000 DPI sensor.",
    priceCents: 2999,
    imageUrl: "https://picsum.photos/seed/mouse/600/600",
    stock: 25,
  },
  {
    slug: "usb-c-hub",
    name: "USB-C Hub",
    description: "7-in-1 USB-C hub with HDMI, SD card reader, and 100W passthrough.",
    priceCents: 4499,
    imageUrl: "https://picsum.photos/seed/hub/600/600",
    stock: 1,
  },
  {
    slug: "desk-lamp",
    name: "LED Desk Lamp",
    description: "Adjustable brightness and color temperature, USB rechargeable.",
    priceCents: 3499,
    imageUrl: "https://picsum.photos/seed/lamp/600/600",
    stock: 0,
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
