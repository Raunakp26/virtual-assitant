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

  //  Helper to pick best available voice
  const getBestVoice = () => {
    const voices = synth.getVoices();
    console.log("Available voices:", voices.map(v => `${v.name} (${v.lang})`));
    // Prefer default English voice
    return (
      voices.find(v => v.lang.startsWith("en-") && v.default) ||
      voices.find(v => v.lang.startsWith("en-")) ||
      voices[0] // fallback
    );
  };

  // ✅ Speak function with robust fallback
  const speak = (text) => {
    if (!text || !text.trim()) return;
    console.log("Speaking:", text);

    synth.cancel(); // stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    const chosenVoice = getBestVoice();
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      console.log("Using voice:", chosenVoice.name);
    }

    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    isSpeakingRef.current = true;

    utterance.onstart = () => console.log("Speech started");
    utterance.onend = () => {
      console.log("Speech ended");
      isSpeakingRef.current = false;
      setTimeout(() => {
        if (!isRecognizingRef.current && isMountedRef.current) {
          console.log("Restarting recognition after speech");
          startRecognition();
        }
      }, 1200); // longer delay for safety
    };
    utterance.onerror = (e) => {
      console.error("Speech error:", e.error);
      isSpeakingRef.current = false;
      setTimeout(() => {
        if (!isRecognizingRef.current && isMountedRef.current) {
          console.log("Restarting recognition after speech error");
          startRecognition();
        }
      }, 1500);
    };

    synth.speak(utterance);
  };

  const startRecognition = () => {
    if (isRecognizingRef.current || isSpeakingRef.current) {
      console.log("Skipping recognition start - busy");
      return;
    }
    try {
      recognitionRef.current.start();
      console.log("Recognition start requested");
    } catch (err) {
      if (err.name !== "InvalidStateError") console.error("Recognition error:", err);
    }
  };

  const stopRecognition = () => {
    if (isRecognizingRef.current) {
      recognitionRef.current?.stop();
      console.log("Recognition stop requested");
    }
  };

  const handleCommand = (data, transcript) => {
    const { type, response } = data;
    const userInput = data.userInput || transcript;

    console.log("=== HANDLING COMMAND ===");
    console.log("Type:", type);
    console.log("Response:", response);
    console.log("User Input:", userInput);
    console.log("========================");

    if (!response || !response.trim()) {
      console.warn("No response to speak");
      return;
    }
    speak(response);

    // Example external commands
    if (type === "google_search") {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(userInput)}`, "_blank");
    }
    if (type === "youtube_search" || type === "youtube_play") {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(userInput)}`, "_blank");
    }
  };

  useEffect(() => {
    if (recognitionRef.current) return; // already init

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("SpeechRecognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    const safeRecognition = () => {
      if (!isSpeakingRef.current && !isRecognizingRef.current) startRecognition();
    };

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
        setTimeout(safeRecognition, 2500);
      }
    };
    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);
      if (event.error !== "aborted" && !isSpeakingRef.current && isMountedRef.current) {
        console.log("Restarting recognition after error");
        setTimeout(safeRecognition, 3500);
      }
    };
    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      console.log("Heard:", transcript);

      if (userData?.assistantName && transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
        console.log("Assistant name detected, processing...");
        stopRecognition();
        isRecognizingRef.current = false;
        setListening(false);
        try {
          const data = await getGeminiResponse(transcript);
          if (data?.response) {
            handleCommand({ ...data, userInput: data.userInput || transcript }, transcript);
          } else {
            speak("I couldn't understand that. Please try again.");
          }
        } catch (err) {
          console.error("Assistant error:", err);
          speak("There was an error processing your request.");
        }
      }
    };

    // Safety: periodic fallback restart
    const fallback = setInterval(() => {
      if (!isSpeakingRef.current && !isRecognizingRef.current && isMountedRef.current) {
        console.log("Fallback restart recognition");
        safeRecognition();
      }
    }, 20000);

    safeRecognition();

    return () => {
      isMountedRef.current = false;
      stopRecognition();
      setListening(false);
      clearInterval(fallback);
    };
  }, [userData]);

  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#030353] flex flex-col justify-center items-center relative">
      <div className="absolute top-6 right-6 flex gap-3">
        <button className="px-5 py-2 bg-white text-black font-semibold rounded-full shadow-md hover:bg-gray-200 transition" onClick={handleLogOut}>
          Log Out
        </button>
        <button className="px-5 py-2 bg-white text-black font-semibold rounded-full shadow-md hover:bg-gray-200 transition" onClick={() => navigate("/customize")}>
          Customize
        </button>
      </div>

      <div className="w-[300px] h-[400px] flex flex-col items-center overflow-hidden rounded-3xl shadow-lg bg-white/10">
        <img src={userData?.assistantImage} alt="Assistant" className="h-full w-full object-cover" />
      </div>

      <h1 className="text-white text-2xl mt-6">
        I'm <span className="font-bold">{userData?.assistantName}</span>
      </h1>

      <p className="mt-4 text-sm text-gray-300">{listening ? "🎤 Listening..." : "🛑 Not Listening"}</p>
    </div>
  );
}

export default Home;
