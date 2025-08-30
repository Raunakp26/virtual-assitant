import axios from "axios";

const geminiResponse = async (command, assistantName, userName) => {
  try {
    const baseUrl = process.env.GEMINI_API_URL;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- 1. LOCAL LOGIC FOR REAL-TIME DATA (Corrected) ---
    // Handle specific, real-time requests directly in your code
    const lowerCaseCommand = command.toLowerCase();

    if (lowerCaseCommand.includes("what is the time") || lowerCaseCommand.includes("current time")) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return {
        // Return a structured object that your frontend can understand
        data: {
          response: `The current time is ${timeString}`,
          type: 'get_time',
          userInput: command
        }
      };
    }

    if (lowerCaseCommand.includes("what is the date") || lowerCaseCommand.includes("today's date")) {
      const now = new Date();
      const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        data: {
          response: `Today's date is ${dateString}`,
          type: 'get_date',
          userInput: command
        }
      };
    }

    // --- 2. GEMINI API CALL (Corrected) ---
    if (!baseUrl || !apiKey) {
      console.error("Missing Gemini configuration!");
      throw new Error("Gemini configuration incomplete");
    }

    const apiUrl = `${baseUrl}?key=${apiKey}`;

    // --- 3. IMPROVED PROMPT (Corrected) ---
    const prompt = `
  You are a virtual assistant named ${assistantName} created by ${userName}.
You must respond with a single, valid JSON object. Do not include any other text.
The JSON object must have a "type" key and a "response" key.
The "response" should be a short, friendly, spoken-friendly reply.

Your available command types and their JSON format:
1. "open_website": To open a specific website or app.
   - Example JSON: {"type": "open_website", "response": "Opening YouTube for you.", "query": "youtube.com"}
2. "google_search": To search for something on Google.
   - Example JSON: {"type": "google_search", "response": "Searching Google for your query.", "query": "how to make tea"}
3. "general_knowledge": For factual or informational questions (e.g., "who is the capital of France?").
   - Example JSON: {"type": "general_knowledge", "response": "The capital of France is Paris."}
4. "youtube_search": To search for a video or song on YouTube.
   - Example JSON: {"type": "youtube_search", "response": "Searching YouTube for your request.", "query": "song name"}
5. "general": Catch-all for simple conversational requests (e.g., greetings, jokes).
   - Example JSON: {"type": "general", "response": "Hello there! How can I help you?"}

Instructions:
- Use the most specific type for the user's request.
- If a command requires additional information, include a 'query' key in the JSON.
- If a user asks "who created you?", respond that you were created by ${userName}.
- Always respond with valid JSON only.

User request: "${command}"`;

    console.log("Making request to Gemini API...");
    const result = await axios.post(apiUrl, {
      "contents": [{
        "parts": [{ "text": prompt }]
      }]
    });

    console.log("Gemini API response received");
    const geminiResponseText = result.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    try {
        const jsonResponse = JSON.parse(geminiResponseText);
        // Add the original user command for context in the frontend
        jsonResponse.userInput = command;
        return { data: jsonResponse };
    } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", geminiResponseText);
        // Fallback for non-JSON responses from Gemini
        return {
          data: {
            type: "general",
            response: "I'm sorry, I encountered an issue. Please try again.",
            userInput: command
          }
        };
    }

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
}

export default geminiResponse;
