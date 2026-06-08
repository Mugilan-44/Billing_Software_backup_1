import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const existing = await User.findOne({
      email: "admin@billing.com",
    });

    if (existing) {
      console.log("Admin already exists");
      process.exit();
    }

    const admin = await User.create({
      name: "Super Admin",
      email: "admin@billing.com",
      password: "admin123",
      role: "SUPER_ADMIN",
    });

    console.log("Admin created successfully");
    console.log(admin);

    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createAdmin();
