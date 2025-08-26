import User from "../model/user.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import geminiResponse from "../gemini.js";
import moment from "moment";
import { response } from "express";
import { exec } from "child_process";
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(400).json({ message: "user not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(400).json({ message: "get current user error" });
  }
};

export const openNativeApp = async (req, res) => {
  try {
    const { appName } = req.body;
    
    if (!appName) {
      return res.status(400).json({ message: "App name is required" });
    }

    // Windows app commands mapping
    const appCommands = {
      'youtube': 'start https://www.youtube.com/',
      'instagram': 'start https://www.instagram.com/',
      'facebook': 'start https://www.facebook.com/',
      'whatsapp': 'start https://web.whatsapp.com/',
      'telegram': 'start https://web.telegram.org/',
      'spotify': 'start https://open.spotify.com/',
      'discord': 'start https://discord.com/app',
      'chrome': 'start chrome',
      'firefox': 'start firefox',
      'edge': 'start msedge',
      'notepad': 'notepad',
      'calculator': 'calc',
      'paint': 'mspaint',
      'word': 'start winword',
      'excel': 'start excel',
      'powerpoint': 'start powerpnt',
      'outlook': 'start outlook',
      'teams': 'start msteams',
      'explorer': 'explorer',
      'control panel': 'control',
      'task manager': 'taskmgr',
      'cmd': 'cmd',
      'powershell': 'powershell',
      'regedit': 'regedit',
      'services': 'services.msc',
      'device manager': 'devmgmt.msc',
      'disk management': 'diskmgmt.msc',
      'event viewer': 'eventvwr.msc'
    };

    const command = appCommands[appName.toLowerCase()];
    
    if (!command) {
      return res.status(400).json({ message: `App '${appName}' not found in supported apps list` });
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error opening ${appName}:`, error);
        return res.status(500).json({ message: `Failed to open ${appName}` });
      }
      
      console.log(`Successfully opened ${appName}`);
      return res.status(200).json({ message: `Successfully opened ${appName}` });
    });

  } catch (error) {
    console.error("Open app error:", error);
    return res.status(500).json({ message: "Failed to open application" });
  }
};

export const updateAssistant = async (req, res) => {
  try {
    const { assistantName, imageUrl } = req.body;
    let assistantImage;

    console.log("=== BACKEND: ASSISTANT UPDATE REQUEST ===");
    console.log("Assistant Name:", assistantName);
    console.log("Image URL:", imageUrl);
    console.log("Uploaded File:", req.file);
    console.log("User ID:", req.user.userId);
    console.log("=========================================");

    if (req.file) {
      // If a file is uploaded, upload it to Cloudinary and use its URL
      assistantImage = await uploadOnCloudinary(req.file.path);
      console.log("Cloudinary Image URL:", assistantImage);
    } else {
      // Otherwise, use imageUrl from the request body
      assistantImage = imageUrl;
    }

    // Update the user in MongoDB and return the new document
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { assistantName, assistantImage },
      { new: true }
    ).select("-password");

    console.log("=== BACKEND: ASSISTANT UPDATED SUCCESSFULLY ===");
    console.log("Updated User:", user);
    console.log("Assistant Name:", user.assistantName);
    console.log("Assistant Image:", user.assistantImage);
    console.log("User Email:", user.email);
    console.log("User Name:", user.name);
    console.log("==============================================");

    return res.status(200).json(user);
  } catch (error) {
    console.error("Backend update assistant error:", error);
    // If error, respond with status 400 and an error message
    return res.status(400).json({ message: "Update assistant error" });
  }
}


export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;
    console.log("=== ASSISTANT REQUEST ===");
    console.log("Command:", command);
    console.log("User object:", req.user);
    console.log("User ID:", req.user?.userId);
    
    if (!req.user || !req.user.userId) {
      console.error("User not authenticated or user ID missing");
      return res.status(401).json({ response: "User not authenticated" });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ response: "User not found" });
    }
    
    // Add command to history
    user.history.push(command);
    await user.save();
    
    const userName = user.name;
    const assistantName = user.assistantName;
    console.log("User Name:", userName);
    console.log("Assistant Name:", assistantName);
    
    const result = await geminiResponse(command, assistantName, userName);
    console.log("Gemini Response:", result);

    if (!result || !result.candidates || !result.candidates[0]) {
      console.error("No valid response from Gemini");
      return res.status(400).json({ response: "Sorry, I can't understand that" });
    }

    const geminiText = result.candidates[0].content.parts[0].text;
    console.log("Gemini Text:", geminiText);
    
    const jsonMatch = geminiText.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      console.error("No JSON found in Gemini response");
      return res.status(400).json({ response: "Sorry, I can't understand that" });
    }
    
    let gemResult;
    try {
      gemResult = JSON.parse(jsonMatch[0]);
      console.log("Parsed JSON:", gemResult);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return res.status(400).json({ response: "Sorry, I can't understand that" });
    }
    const type = gemResult.type;
    console.log("Parsed Result:", gemResult);

    switch (type) {
    
      case 'get_date':
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `current date is ${moment().format("YYYY-MM-DD")}`
        });

      case 'get_time':
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `current time is ${moment().format("hh:mm A")}`
        });
        
      case 'get_month':
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `today is ${moment().format("MMMM")}`
        });

      case 'get_day':
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `today is ${moment().format("dddd")}`
        });
        
      case 'google_search':
      case 'youtube_search':
      case 'youtube_play':
      case 'general':
      case 'calculator_open':
      case 'instagram_open':
      case 'facebook_open':
      case 'weather-show':
      case 'open_app':
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: gemResult.response
        });
        
      default:
        console.warn("Unknown command type:", type);
        return res.json({
          type: "general",
          userInput: gemResult.userInput || command,
          response: gemResult.response || "I didn't understand that command."
        });
      
    }
  } catch (error) {
    console.error("=== ASSISTANT ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("=======================");
    return res.status(500).json({ response: "Ask assistant error." });
  }
};
