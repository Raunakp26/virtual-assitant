import dotenv from 'dotenv';
import fs from 'fs';

// Load .env file
dotenv.config();

console.log("=== CHECKING .ENV FILE ===");
console.log("Current directory:", process.cwd());

// Check if .env file exists
if (fs.existsSync('.env')) {
  console.log("✅ .env file exists");
  
  // Read and display .env content
  const content = fs.readFileSync('.env', 'utf8');
  console.log("\n=== .ENV CONTENT ===");
  console.log(content);
  console.log("=== END CONTENT ===\n");
  
  // Check specific variables
  console.log("=== ENVIRONMENT VARIABLES ===");
  console.log("GEMINI_API_URL:", process.env.GEMINI_API_URL ? "✅ SET" : "❌ MISSING");
  console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME ? "✅ SET" : "❌ MISSING");
  console.log("JWT_SECRET:", process.env.JWT_SECRET ? "✅ SET" : "❌ MISSING");
  
  if (!process.env.GEMINI_API_URL) {
    console.log("\n❌ GEMINI_API_URL is missing!");
    console.log("Please add this line to your .env file:");
    console.log("GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY");
  } else {
    console.log("\n✅ GEMINI_API_URL is set!");
  }
} else {
  console.log("❌ .env file does not exist!");
}

