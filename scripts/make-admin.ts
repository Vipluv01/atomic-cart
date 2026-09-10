import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/lib/models/User";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/make-admin.ts <email>");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(uri);

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { role: "admin" } },
    { returnDocument: "after" }
  );

  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  console.log(`${user.email} is now role: ${user.role}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
