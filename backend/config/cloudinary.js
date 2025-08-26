import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// Function to check and configure Cloudinary
const configureCloudinary = () => {

  // Check if Cloudinary environment variables are set
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("=== CLOUDINARY CONFIGURATION ERROR ===");
    console.error("Missing Cloudinary environment variables:");
    console.error("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Missing");
    console.error("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "Set" : "Missing");
    console.error("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "Set" : "Missing");
    console.error("Please set these variables in your .env file");
    console.error("=========================================");
    return false;
  } else {
    console.log("=== CLOUDINARY CONFIGURATION SUCCESS ===");
    console.log("All Cloudinary variables are set!");
    console.log("=====================================");
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return true;
  }
};

const uploadOnCloudinary = async (filePath) => {
  if (!filePath) {
    console.log("No file path provided to Cloudinary upload");
    return null;
  }

  try {
    console.log("=== CLOUDINARY UPLOAD START ===");
    console.log("Uploading file:", filePath);
    console.log("Cloudinary config:", {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? "Set" : "Missing",
      api_secret: process.env.CLOUDINARY_API_SECRET ? "Set" : "Missing"
    });

    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto", 
    });

    console.log("Cloudinary upload successful!");
    console.log("Uploaded URL:", uploadResult.secure_url);
    console.log("Public ID:", uploadResult.public_id);
    console.log("===============================");

    fs.unlink(filePath, (err) => {
      if (err) console.error("File deletion error:", err);
    });

    return uploadResult.secure_url;
  } catch (error) {
    console.error("=== CLOUDINARY UPLOAD ERROR ===");
    console.error("Error uploading to Cloudinary:", error.message);
    console.error("Error details:", error);
    console.error("File path:", filePath);
    console.error("===============================");
    
    // cleanup if upload fails
    fs.unlink(filePath, (err) => {
      if (err) console.error("File deletion error:", err);
    });
    return null;
  }
};

export { configureCloudinary };
export default uploadOnCloudinary;
