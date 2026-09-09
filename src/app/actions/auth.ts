"use server";

import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<{ error: string } | { success: true }> {
  if (!email || !password || password.length < 8) {
    return { error: "Email and an 8+ character password are required." };
  }

  await connectToDatabase();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return { error: "An account with that email already exists." };

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ email: email.toLowerCase(), passwordHash, name });

  return { success: true };
}
