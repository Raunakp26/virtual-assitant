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

  // Function to check and log available voices
  const checkVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log("=== AVAILABLE VOICES ===");
    voices.forEach((voice, index) => {
      console.log(`${index}: ${voice.name} (${voice.lang}) - Default: ${voice.default}`);
    });
    console.log("========================");
  };

  // Initialize voices when component mounts
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
    if (isRecognizingRef.current) {
      console.log("Recognition already running, skipping start");
      return;
    }
    
    if (isSpeakingRef.current) {
      console.log("Currently speaking, skipping recognition start");
      return;
    }

    if (!recognitionRef.current) {
      console.log("Recognition not initialized, skipping start");
      return;
    }
    
    try {
      recognitionRef.current.start();
      console.log("Recognition start requested");
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Recognition start error:", error);
      }
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

  const resetRecognition = () => {
    console.log("Resetting recognition state");
    stopRecognition();
    isRecognizingRef.current = false;
    setListening(false);
    setTimeout(() => {
      if (isMountedRef.current && !isSpeakingRef.current) {
        startRecognition();
      }
    }, 1000);
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
    if (englishVoice) {
      utterance.voice = englishVoice;
      console.log("Using voice:", englishVoice.name);
    }

    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    isSpeakingRef.current = true;
    
    utterance.onstart = () => {
      console.log("Speech started");
    };
    
    utterance.onend = () => {
      console.log("Speech ended");
      isSpeakingRef.current = false;
      setTimeout(() => {
        if (!isRecognizingRef.current && isMountedRef.current) {
          console.log("Restarting recognition after speech");
          startRecognition();
        }
      }, 1000);
    };
    
    utterance.onerror = (event) => {
      console.error("Speech error:", event.error);
      isSpeakingRef.current = false;
      setTimeout(() => {
        if (!isRecognizingRef.current && isMountedRef.current) {
          console.log("Restarting recognition after speech error");
          startRecognition();
        }
      }, 1000);
    };

    synth.speak(utterance);
  };

const handleCommand = (data) => {
  const { type, response, query, url, userInput } = data;

  console.log("=== HANDLING COMMAND ===");
  console.log("Type:", type);
  console.log("Response:", response);
  console.log("Query:", query);
  console.log("URL:", url);
  console.log("========================");

  if (!response || response.trim() === "") {
    console.error("No response to speak!");
    return;
  }

  // Pehle bol do
  speak(response);

  switch (type) {
    case "open_website":
    case "google_search":
    case "youtube_search": {
      // Agar backend se url mila hai → direct open
      if (url) {
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        window.open(fullUrl, "_blank");
      } else if (query) {
        // Agar backend se query aayi hai → apna URL banao
        let searchUrl = "";
        if (type === "google_search") {
          searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        } else if (type === "youtube_search") {
          searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        } else {
          // generic website
          searchUrl = query.includes(".")
            ? `https://${query}`
            : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
        window.open(searchUrl, "_blank");
      } else {
        // fallback: youtube ya google khol do
        if (type === "youtube_search") {
          window.open("https://www.youtube.com", "_blank");
        } else if (type === "google_search") {
          window.open("https://www.google.com", "_blank");
        }
      }
      break;
    }

    case "general_knowledge":
    case "get_time":
    case "get_date":
    case "get_day":
    case "get_month":
    case "general": {
      // Sirf bolna hai
      break;
    }

    default: {
      console.warn("⚠️ Unknown command type:", type);
      speak("Sorry, I am not sure how to handle that.");
      break;
    }
  }
};



  const safeRecognition = () => {
    if (!isSpeakingRef.current && !isRecognizingRef.current) {
      startRecognition();
    } else {
      console.log("Skipping recognition start - speaking or already recognizing");
    }
  };

  const fallbackIntervalRef = useRef(null);

  // New function to start the entire process
  const startJarvis = () => {
    // Check if recognition is already running to prevent duplicates
    if (isRecognizingRef.current) {
      console.log("Jarvis is already running.");
      return;
    }

    // Start recognition and speech
    speak("Hello there! How can I help you today?");
    safeRecognition();

    // Start the fallback interval
    fallbackIntervalRef.current = setInterval(() => {
      if (!isSpeakingRef.current && !isRecognizingRef.current && isMountedRef.current) {
        console.log("Fallback: restarting recognition");
        safeRecognition();
      }
    }, 15000);
  };

  // Main Effect for initializing SpeechRecognition API
  useEffect(() => {
    if (recognitionRef.current) {
      console.log("Recognition already initialized, skipping");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log("Recognition started");
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      isRecognizingRef.current = false;
      setListening(false);
      if (!isSpeakingRef.current && isMountedRef.current) {
        console.log("Scheduling recognition restart");
        setTimeout(safeRecognition, 2000);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);
      if (event.error !== "aborted" && !isSpeakingRef.current && isMountedRef.current) {
        console.log("Scheduling recognition restart after error");
        setTimeout(safeRecognition, 3000);
      }
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      console.log("Heard:", transcript);
      if (userData?.assistantName && transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
        console.log("Assistant name detected, processing command...");
        stopRecognition();
        isRecognizingRef.current = false;
        setListening(false);
        try {
          const data = await getGeminiResponse(transcript);
          console.log("Assistant response:", data);
          if (data?.response) {
            console.log("Assistant says:", data.response);
            handleCommand({ ...data, userInput: data.userInput || transcript }, transcript);
          } else {
            console.log("No response from assistant");
            speak("I'm sorry, I couldn't understand that. Please try again.");
          }
        } catch (error) {
          console.error("Error getting assistant response:", error);
          speak("I'm sorry, there was an error processing your request. Please try again.");
        }
      }
    };

    return () => {
      console.log("Cleaning up recognition");
      isMountedRef.current = false;
      stopRecognition();
      setListening(false);
      isRecognizingRef.current = false;
      // Clear the fallback interval on unmount
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (userData?.assistantName) {
      console.log("User data updated, assistant name:", userData.assistantName);
    }
  }, [userData]);

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

      {/* NEW: Start Button */}
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
