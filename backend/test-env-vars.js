import dotenv from 'dotenv';
import fs from 'fs';

// Load .env file
dotenv.config();

console.log("=== ENVIRONMENT VARIABLES TEST ===");
console.log("Current working directory:", process.cwd());
console.log("Does .env file exist?", fs.existsSync('.env'));

// Read .env file content
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  console.log("=== .ENV FILE CONTENT ===");
  console.log(envContent);
  console.log("=== END .ENV CONTENT ===");
} catch (error) {
  console.log("Error reading .env file:", error.message);
}

console.log("=== ALL ENVIRONMENT VARIABLES ===");
Object.keys(process.env).forEach(key => {
  if (key.includes('GEMINI') || key.includes('CLOUDINARY') || key.includes('JWT') || key.includes('MONGODB') || key.includes('PORT')) {
    console.log(`${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
  }
});

console.log("=== SPECIFIC GEMINI VAR ===");
console.log("GEMINI_API_URL:", process.env.GEMINI_API_URL);
console.log("GEMINI_API_URL type:", typeof process.env.GEMINI_API_URL);
console.log("GEMINI_API_URL length:", process.env.GEMINI_API_URL ? process.env.GEMINI_API_URL.length : 'N/A');
