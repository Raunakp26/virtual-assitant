// src/pages/Home.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } = useContext(userDataContext);
  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const isMountedRef = useRef(true);
  const synth = window.speechSynthesis;

  const checkVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log("=== AVAILABLE VOICES ===");
    voices.forEach((voice, index) => {
      console.log(`${index}: ${voice.name} (${voice.lang}) - Default: ${voice.default}`);
    });
    console.log("========================");
  };

  useEffect(() => {
    if (window.speechSynthesis.getVoices().length > 0) {
      checkVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = checkVoices;
    }
  }, []);

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true });
      setUserData(null);
      navigate("/signin");
    } catch (error) {
      setUserData(null);
      console.log(error);
    }
  };

  const startRecognition = () => {
    if (isRecognizingRef.current || isSpeakingRef.current || !recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      console.log("Recognition start requested");
    } catch (error) {
      if (error.name !== "InvalidStateError") console.error("Recognition start error:", error);
    }
  };

  const stopRecognition = () => {
    if (isRecognizingRef.current) {
      try {
        recognitionRef.current?.stop();
        console.log("Recognition stop requested");
      } catch (error) {
        console.error("Recognition stop error:", error);
      }
    }
  };

  const speak = (text) => {
    console.log("Speaking:", text);
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => v.lang.startsWith("en-") && v.default) ||
                         voices.find((v) => v.lang.startsWith("en-")) ||
                         voices[0];
    if (englishVoice) utterance.voice = englishVoice;

    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    isSpeakingRef.current = true;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setTimeout(() => {
        if (!isRecognizingRef.current && isMountedRef.current) startRecognition();
      }, 1000);
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setTimeout(() => {
        if (!isRecognizingRef.current && isMountedRef.current) startRecognition();
      }, 1000);
    };

    synth.speak(utterance);
  };

// ✅ UPDATED HANDLECOMMAND FUNCTION WITH RESPONSE-BASED DETECTION
// ✅ UPDATED HANDLECOMMAND FUNCTION WITH RESPONSE-BASED DETECTION
const handleCommand = (data) => {
  const { type, response, query, url } = data;

  console.log("=== HANDLING COMMAND ===");
  console.log("Type:", type);
  console.log("Response:", response);
  console.log("Query:", query);
  console.log("URL:", url);
  console.log("Raw data:", JSON.stringify(data, null, 2));
  console.log("========================");

  // Always speak the response first
  if (response && response.trim() !== "") {
    speak(response);
  }

  // 🔧 SMART DETECTION: Check response text for website opening commands
  const responseText = response?.toLowerCase() || "";
  
  if (type === "general" && responseText.includes("opening")) {
    let detectedUrl = "";
    
    if (responseText.includes("youtube")) {
      detectedUrl = "https://www.youtube.com";
      console.log("🔧 Detected YouTube command from response text");
    } else if (responseText.includes("facebook")) {
      detectedUrl = "https://www.facebook.com";
      console.log("🔧 Detected Facebook command from response text");
    } else if (responseText.includes("instagram")) {
      detectedUrl = "https://www.instagram.com";
      console.log("🔧 Detected Instagram command from response text");
    } else if (responseText.includes("twitter") || responseText.includes("x.com")) {
      detectedUrl = "https://x.com";
      console.log("🔧 Detected Twitter/X command from response text");
    } else if (responseText.includes("linkedin")) {
      detectedUrl = "https://www.linkedin.com";
      console.log("🔧 Detected LinkedIn command from response text");
    } else if (responseText.includes("gmail")) {
      detectedUrl = "https://mail.google.com";
      console.log("🔧 Detected Gmail command from response text");
    } else if (responseText.includes("amazon")) {
      detectedUrl = "https://www.amazon.in";
      console.log("🔧 Detected Amazon command from response text");
    } else if (responseText.includes("flipkart")) {
      detectedUrl = "https://www.flipkart.com";
      console.log("🔧 Detected Flipkart command from response text");
    } else if (responseText.includes("netflix")) {
      detectedUrl = "https://www.netflix.com";
      console.log("🔧 Detected Netflix command from response text");
    } else if (responseText.includes("google")) {
      detectedUrl = "https://www.google.com";
      console.log("🔧 Detected Google command from response text");
    }
    
    if (detectedUrl) {
      console.log("🚀 Opening detected URL:", detectedUrl);
      setTimeout(() => {
        window.open(detectedUrl, "_blank");
      }, 500);
      return; // Exit early since we handled it
    }
  }

  // Handle search commands from general responses
  if (type === "general" && responseText.includes("searching")) {
    let searchUrl = "";
    
    if (responseText.includes("google")) {
      // Extract search query from user input if available
      const userInput = data.userInput?.toLowerCase() || "";
      const searchQuery = userInput.replace(/.*search.*google.*for\s*/i, "").replace(/.*search.*on.*google\s*/i, "").trim();
      
      if (searchQuery) {
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      } else {
        searchUrl = "https://www.google.com";
      }
      console.log("🔧 Detected Google search from response text");
    } else if (responseText.includes("youtube")) {
  // Extract search query from user input if available
  const userInput = data.userInput?.toLowerCase() || "";
  
  // ✅ Handle multiple patterns like "search on YouTube", "play on YouTube", "open YouTube <query>"
  const searchQuery = userInput
    .replace(/.*search.*youtube.*for\s*/i, "")
    .replace(/.*search.*on.*youtube\s*/i, "")
    .replace(/.*play.*on.*youtube\s*/i, "")
    .replace(/.*open.*youtube\s*/i, "") // 🔧 Added this
    .trim();
  
  let searchUrl = "";
  if (searchQuery) {
    searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
  } else {
    searchUrl = "https://www.youtube.com";
  }

  console.log("🔧 Detected YouTube search/open from response text");
  
  console.log("🚀 Opening search URL:", searchUrl);
  setTimeout(() => {
    window.open(searchUrl, "_blank");
  }, 500);
  return;
}


  // Handle normal typed responses (original logic)
  switch (type) {
    case "open_website":
    case "google_search":
    case "youtube_search":
    case "facebook_open":
    case "instagram_open":
    case "twitter_open":
    case "linkedin_open":
    case "gmail_open":
    case "amazon_open":
    case "flipkart_open":
    case "netflix_open": {
      if (url) {
        console.log("✅ Opening URL from backend:", url);
        setTimeout(() => {
          window.open(url, "_blank");
        }, 500);
      } else {
        console.warn("⚠️ No URL provided by backend for type:", type);
        // Fallback URL construction
        let fallbackUrl = "";
        
        if (query) {
          if (type === "google_search") {
            fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          } else if (type === "youtube_search") {
            fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          } else if (type === "open_website") {
            if (/\.[a-z]{2,}$/i.test(query)) {
              fallbackUrl = query.startsWith("http") ? query : `https://${query}`;
            } else {
              fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
          }
        } else {
          // Default URLs when no query - handle all website types
          if (type === "youtube_search") {
            fallbackUrl = "https://www.youtube.com";
          } else if (type === "google_search") {
            fallbackUrl = "https://www.google.com";
          } else if (type === "facebook_open") {
            fallbackUrl = "https://www.facebook.com";
          } else if (type === "instagram_open") {
            fallbackUrl = "https://www.instagram.com";
          } else if (type === "twitter_open") {
            fallbackUrl = "https://x.com";
          } else if (type === "linkedin_open") {
            fallbackUrl = "https://www.linkedin.com";
          } else if (type === "gmail_open") {
            fallbackUrl = "https://mail.google.com";
          } else if (type === "amazon_open") {
            fallbackUrl = "https://www.amazon.in";
          } else if (type === "flipkart_open") {
            fallbackUrl = "https://www.flipkart.com";
          } else if (type === "netflix_open") {
            fallbackUrl = "https://www.netflix.com";
          }
        }

        if (fallbackUrl) {
          console.log("🔄 Using fallback URL:", fallbackUrl);
          setTimeout(() => {
            window.open(fallbackUrl, "_blank");
          }, 500);
        }
      }
      break;
    }
  case "weather-show":
  console.log("🌦 Showing weather");
  speak(data.response);

  // You can also display weather info in UI or call weather API
  showWeatherOnUI(data); 
  break;
    case "general_knowledge":
    case "get_time":
    case "get_date":
    case "get_day":
    case "get_month":
    case "general":
      console.log("ℹ️ Informational response - no action needed");
      break;

    default:
      console.warn("⚠️ Unknown command type:", type);
      speak("Sorry, I'm not sure how to handle that.");
      break;
  }
};

  const safeRecognition = () => {
    if (!isSpeakingRef.current && !isRecognizingRef.current) startRecognition();
  };

  const fallbackIntervalRef = useRef(null);

  const startJarvis = () => {
    if (isRecognizingRef.current) return;
    speak("Hello there! How can I help you today?");
    safeRecognition();

    fallbackIntervalRef.current = setInterval(() => {
      if (!isSpeakingRef.current && !isRecognizingRef.current && isMountedRef.current) {
        safeRecognition();
      }
    }, 15000);
  };

  useEffect(() => {
    if (recognitionRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (!isSpeakingRef.current && isMountedRef.current) {
        setTimeout(safeRecognition, 2000);
      }
    };

    recognition.onerror = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (!isSpeakingRef.current && isMountedRef.current) {
        setTimeout(safeRecognition, 3000);
      }
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      console.log("Heard:", transcript);
      if (userData?.assistantName && transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
        stopRecognition();
        isRecognizingRef.current = false;
        setListening(false);
        try {
          const data = await getGeminiResponse(transcript);
          if (data?.response) {
            handleCommand({ ...data, userInput: data.userInput || transcript });
          } else {
            speak("I'm sorry, I couldn't understand that. Please try again.");
          }
        } catch {
          speak("I'm sorry, there was an error processing your request.");
        }
      }
    };

    return () => {
      isMountedRef.current = false;
      stopRecognition();
      setListening(false);
      isRecognizingRef.current = false;
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
    };
  }, []);

  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#030353] flex flex-col justify-center items-center relative">
      <div className="absolute top-6 right-6 flex gap-3">
        <button
          className="px-5 py-2 bg-white text-black font-semibold rounded-full shadow-md hover:bg-gray-200 transition"
          onClick={handleLogOut}
        >
          Log Out
        </button>
        <button
          className="px-5 py-2 bg-white text-black font-semibold rounded-full shadow-md hover:bg-gray-200 transition"
          onClick={() => navigate("/customize")}
        >
          Customize
        </button>
      </div>

      {!(listening || isSpeakingRef.current) && (
        <button
          className="px-8 py-4 mb-8 bg-blue-600 text-white font-bold text-xl rounded-full shadow-xl hover:bg-blue-700 transition transform hover:scale-105"
          onClick={startJarvis}
        >
          Start Jarvis
        </button>
      )}

      <div className="w-[300px] h-[400px] flex flex-col items-center overflow-hidden rounded-3xl shadow-lg bg-white/10">
        <img src={userData?.assistantImage} alt="Assistant" className="h-full w-full object-cover" />
      </div>

      <h1 className="text-white text-2xl mt-6">
        I'm <span className="font-bold">{userData?.assistantName}</span>
      </h1>

      <p className="mt-4 text-sm text-gray-300">
        {listening ? "🎤 Listening..." : "🛑 Not Listening"}
      </p>
    </div>
  );
}

export default Home;
