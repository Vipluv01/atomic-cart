"use server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { createPresignedUploadUrl } from "@/lib/s3";
import { revalidateProductCache } from "@/lib/revalidateProducts";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

export async function getUploadUrl(contentType: string) {
  await requireSession();
  return createPresignedUploadUrl(contentType);
}

export async function createProduct(input: {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
}): Promise<{ error: string } | { success: true }> {
  await requireSession();
  await connectToDatabase();

  const existing = await Product.findOne({ slug: input.slug });
  if (existing) return { error: "A product with that slug already exists." };

  await Product.create(input);
  revalidateProductCache();
  return { success: true };
}
