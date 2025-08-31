import axios from "axios";

const geminiResponse = async (command, assistantName, userName) => {
  try {
    const baseUrl = process.env.GEMINI_API_URL;
    const apiKey = process.env.GEMINI_API_KEY;
    const lowerCaseCommand = command.toLowerCase();

    let responseData = null;

    // --- 1. TIME & DATE ---
    if (lowerCaseCommand.includes("what is the time") || lowerCaseCommand.includes("current time")) {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      responseData = {
        type: "get_time",
        response: `The current time is ${timeString}`
      };
    } else if (lowerCaseCommand.includes("what is the date") || lowerCaseCommand.includes("today's date")) {
      const now = new Date();
      const dateString = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      responseData = {
        type: "get_date",
        response: `Today's date is ${dateString}`
      };
    }

    // --- 2. GOOGLE SEARCH ---
    else if (lowerCaseCommand.includes("search on google")) {
      const query = lowerCaseCommand.replace("search on google", "").trim();
      responseData = {
        type: "google_search",   // ✅ frontend ke saath match
        response: `Searching Google for ${query}.`,
        query,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
      };
    }

    // --- 3. YOUTUBE ---
    else if (
      lowerCaseCommand.includes("open youtube") ||
      lowerCaseCommand.includes("search youtube") ||
      lowerCaseCommand.includes("play on youtube") ||
      lowerCaseCommand.includes("play song")
    ) {
      const query = lowerCaseCommand
        .replace(/(open|search|play on|play) youtube/g, "")
        .replace(/for\s+/g, "")
        .trim();

      let url = "https://www.youtube.com";
      if (query) {
        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      }

      responseData = {
        type: "youtube_search",   // ✅ frontend ke saath match
        response: query ? `Searching YouTube for ${query}.` : "Opening YouTube for you.",
        query: query || null,
        url
      };
    }

    // --- 4. GENERIC WEBSITE OPENER ---
    else if (lowerCaseCommand.startsWith("open ")) {
      const siteName = lowerCaseCommand.replace("open", "").trim();
      let url;

      if (siteName.includes("facebook")) url = "https://www.facebook.com";
      else if (siteName.includes("instagram")) url = "https://www.instagram.com";
      else if (siteName.includes("twitter") || siteName.includes("x")) url = "https://x.com";
      else if (siteName.includes("linkedin")) url = "https://www.linkedin.com";
      else if (siteName.includes("gmail")) url = "https://mail.google.com";
      else if (siteName.includes("amazon")) url = "https://www.amazon.in";
      else if (siteName.includes("flipkart")) url = "https://www.flipkart.com";
      else if (siteName.includes("netflix")) url = "https://www.netflix.com";
      else if (siteName.includes("zomato")) url = "https://www.zomato.com";
      else if (siteName.includes("swiggy")) url = "https://www.swiggy.com";
      else if (siteName.includes("calculator")) url = "https://www.google.com/search?q=calculator";
      else if (siteName.includes("weather")) url = "https://www.google.com/search?q=weather";
      else {
        if (siteName.includes(".")) {
          url = `https://${siteName}`;
        } else {
          url = `https://www.google.com/search?q=${encodeURIComponent(siteName)}`;
        }
      }

      responseData = {
        type: "open_website",   // ✅ frontend ke saath match
        response: `Opening ${siteName} for you.`,
        query: siteName,
        url
      };
    }

    // --- 5. FALLBACK TO GEMINI ---
    if (!responseData) {
      if (!baseUrl || !apiKey) {
        console.error("Missing Gemini configuration!");
        throw new Error("Gemini configuration incomplete");
      }

      const apiUrl = `${baseUrl}?key=${apiKey}`;

      const prompt = `
You are a virtual assistant named ${assistantName} created by ${userName}.
You must respond with a single, valid JSON object. Do not include any other text.
The JSON object must have a "type" key and a "response" key.

Types:
- general_knowledge
- general

User request: "${command}"`;

      const result = await axios.post(apiUrl, {
        contents: [{ parts: [{ text: prompt }] }]
      });

      const geminiResponseText = result.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      try {
        responseData = JSON.parse(geminiResponseText);
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", geminiResponseText);
        responseData = {
          type: "general",
          response: "I'm sorry, I encountered an issue. Please try again."
        };
      }
    }

    responseData.userInput = command;
    return responseData;

  } catch (error) {
    console.error("=== GEMINI ERROR ===");
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Error status:", error.response.status);
      console.error("Error data:", error.response.data);
    }
    console.error("====================");
    throw error;
  }
};

export default geminiResponse;
