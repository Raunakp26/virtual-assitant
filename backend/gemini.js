import axios from "axios";

const geminiResponse = async (command, assistantName, userName) => {
  try {
    const baseUrl = process.env.GEMINI_API_URL;
    const apiKey = process.env.GEMINI_API_KEY;
    const lowerCaseCommand = command.toLowerCase();

    // --- 1. LOCAL LOGIC FOR ALL SITES (Corrected & Enhanced) ---
    let responseData = null;

    // Handle real-time data first
    if (lowerCaseCommand.includes("what is the time") || lowerCaseCommand.includes("current time")) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      responseData = {
        type: 'get_time',
        response: `The current time is ${timeString}`
      };
    } else if (lowerCaseCommand.includes("what is the date") || lowerCaseCommand.includes("today's date")) {
      const now = new Date();
      const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      responseData = {
        type: 'get_date',
        response: `Today's date is ${dateString}`
      };
    }
    // Handle site searches and openings by extracting the query directly
    else if (lowerCaseCommand.includes("search on google")) {
      const query = lowerCaseCommand.replace("search on google", "").trim();
      responseData = {
        type: 'google_search',
        response: `Searching Google for ${query}.`,
        query: query
      };
    } else if (lowerCaseCommand.includes("open youtube") || lowerCaseCommand.includes("search youtube") || lowerCaseCommand.includes("play on youtube") || lowerCaseCommand.includes("play song")) {
      const query = lowerCaseCommand
        .replace("open youtube", "")
        .replace("search youtube", "")
        .replace("play on youtube", "")
        .replace("play song", "")
        .trim();
      responseData = {
        type: 'youtube_search',
        response: `Searching YouTube for ${query}.`,
        query: query
      };
    } else if (lowerCaseCommand.includes("open facebook")) {
      responseData = {
        type: 'open_website',
        response: "Opening Facebook for you.",
        query: "https://www.facebook.com"
      };
    } else if (lowerCaseCommand.includes("open instagram")) {
      responseData = {
        type: 'open_website',
        response: "Opening Instagram for you.",
        query: "https://www.instagram.com"
      };
    } else if (lowerCaseCommand.includes("open calculator")) {
      responseData = {
        type: 'open_website',
        response: "Opening the calculator.",
        query: "https://www.google.com/search?q=calculator"
      };
    } else if (lowerCaseCommand.includes("show weather") || lowerCaseCommand.includes("check weather")) {
      responseData = {
        type: 'open_website',
        response: "Showing you the current weather.",
        query: "https://www.google.com/search?q=weather"
      };
    }

    // If a specific command was not found, fall back to the Gemini API
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
The "response" should be a short, friendly, spoken-friendly reply.

Your available command types and their JSON format:
1. "general_knowledge": For factual or informational questions.
   - Example JSON: {"type": "general_knowledge", "response": "The capital of France is Paris."}
2. "general": Catch-all for simple conversational requests (e.g., greetings, jokes).
   - Example JSON: {"type": "general", "response": "Hello there! How can I help you?"}

Instructions:
- If a user asks "who created you?", respond that you were created by ${userName}.
- Always respond with valid JSON only.

User request: "${command}"`;

      console.log("Making request to Gemini API for general knowledge...");
      const result = await axios.post(apiUrl, {
        "contents": [{
          "parts": [{ "text": prompt }]
        }]
      });

      console.log("Gemini API response received");
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

    // Add the original user command and return the final response
    responseData.userInput = command;
    return { data: responseData };

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
