import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "../src/lib/models/Product";

const SAMPLE_PRODUCTS = [
  {
    slug: "mechanical-keyboard",
    name: "Mechanical Keyboard",
    description: "Hot-swappable 75% mechanical keyboard with tactile switches.",
    priceCents: 8999,
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80",
    stock: 12,
  },
  {
    slug: "compact-keyboard",
    name: "Compact 60% Keyboard",
    description: "Tenkeyless layout with a low-profile aluminum frame.",
    priceCents: 7499,
    imageUrl: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80",
    stock: 8,
  },
  {
    slug: "wireless-mouse",
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse with a 4000 DPI sensor.",
    priceCents: 2999,
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80",
    stock: 25,
  },
  {
    slug: "gaming-mouse",
    name: "Gaming Mouse",
    description: "Lightweight symmetrical shell with an 8K polling rate sensor.",
    priceCents: 5999,
    imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&q=80",
    stock: 1,
  },
  {
    slug: "4k-monitor",
    name: "4K Monitor",
    description: "27-inch 4K IPS display with a 95% DCI-P3 color gamut.",
    priceCents: 32999,
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80",
    stock: 6,
  },
  {
    slug: "noise-cancelling-headphones",
    name: "Noise Cancelling Headphones",
    description: "Over-ear active noise cancellation with 30-hour battery life.",
    priceCents: 24999,
    imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80",
    stock: 10,
  },
  {
    slug: "wireless-earbuds",
    name: "Wireless Earbuds",
    description: "True wireless earbuds with a compact charging case.",
    priceCents: 14999,
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80",
    stock: 15,
  },
  {
    slug: "vintage-headphones",
    name: "Vintage Studio Headphones",
    description: "Retro-styled wired headphones with a warm, flat frequency response.",
    priceCents: 8999,
    imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
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
