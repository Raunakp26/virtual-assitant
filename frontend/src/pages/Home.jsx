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

  // ✅ FIXED HANDLECOMMAND
  const handleCommand = (data) => {
    const { type, response, query, url } = data;

    console.log("=== HANDLING COMMAND ===");
    console.log("Type:", type);
    console.log("Response:", response);
    console.log("Query:", query);
    console.log("URL:", url);
    console.log("========================");

    if (!response || response.trim() === "") return;

    speak(response);

    switch (type) {
      case "open_website":
      case "google_search":
      case "youtube_search": {
        let finalUrl = "";

        if (url) {
          finalUrl = url.startsWith("http") ? url : `https://${url}`;
        } else if (query) {
          if (type === "google_search") {
            finalUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          } else if (type === "youtube_search") {
            finalUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          } else {
            // check if query looks like a domain
            if (/\.[a-z]{2,}$/.test(query)) {
              finalUrl = query.startsWith("http") ? query : `https://${query}`;
            } else {
              finalUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
          }
        } else {
          finalUrl = type === "youtube_search"
            ? "https://www.youtube.com"
            : "https://www.google.com";
        }

        if (finalUrl) {
          console.log("Opening URL:", finalUrl);
          window.open(finalUrl, "_blank");
        }
        break;
      }

      case "general_knowledge":
      case "get_time":
      case "get_date":
      case "get_day":
      case "get_month":
      case "general":
        // Sirf bolna hai
        break;

      default:
        console.warn("⚠️ Unknown command type:", type);
        speak("Sorry, I am not sure how to handle that.");
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
