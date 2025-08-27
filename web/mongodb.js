import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "..", ".env") });

const mongoUri = process.env.DATABASE_URL;

if (!mongoUri) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

export const connectMongoDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
