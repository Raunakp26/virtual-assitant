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
    // Check voices immediately if available
    if (window.speechSynthesis.getVoices().length > 0) {
      checkVoices();
    } else {
      // Wait for voices to load
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
    // Wait a bit before restarting
    setTimeout(() => {
      if (isMountedRef.current && !isSpeakingRef.current) {
        startRecognition();
      }
    }, 1000);
  };

  const speak = (text) => {
    console.log("Speaking:", text);
    
    // Cancel any ongoing speech
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US"; // Changed to English for better compatibility
    
    // Try to select an English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => v.lang.startsWith("en-") && v.default) || 
                        voices.find((v) => v.lang.startsWith("en-")) ||
                        voices[0];
    
    if (englishVoice) {
      utterance.voice = englishVoice;
      console.log("Using voice:", englishVoice.name);
    }

    utterance.rate = 0.9; // Slightly slower for better clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    isSpeakingRef.current = true;
    
    utterance.onstart = () => {
      console.log("Speech started");
    };
    
    utterance.onend = () => {
      console.log("Speech ended");
      isSpeakingRef.current = false;
      // Restart recognition after a longer delay to ensure speech is fully complete
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
      // Restart recognition even if speech fails
      setTimeout(() => {
        if (!isRecognizingRef.current && isMountedRef.current) {
          console.log("Restarting recognition after speech error");
          startRecognition();
        }
      }, 1000);
    };

    synth.speak(utterance);
  };

  const handleCommand = (data, transcript) => {
    const { type, response } = data;
    const userInput = data.userInput || transcript; // fallback

    console.log("=== HANDLING COMMAND ===");
    console.log("Type:", type);
    console.log("Response:", response);
    console.log("User Input:", userInput);
    console.log("========================");

    // Check if response exists and is not empty
    if (!response || response.trim() === "") {
      console.error("No response to speak!");
      return;
    }

    // Speak the response
    speak(response);

    // Handle different command types
    if (type === "google_search") {
      const query = encodeURIComponent(userInput);
      window.open(`https://www.google.com/search?q=${query}`, "_blank");
    }

    if (type === "calculator_open") {
      window.open("https://www.google.com/search?q=calculator", "_blank");
    }

    if (type === "instagram_open") {
      window.open("https://www.instagram.com/", "_blank");
    }

    if (type === "facebook_open") {
      window.open("https://www.facebook.com/", "_blank");
    }

    if (type === "weather-show") {
      window.open("https://www.google.com/search?q=weather", "_blank");
    }

    if (type === "youtube_search" || type === "youtube_play") {
      const query = encodeURIComponent(userInput);
      window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
    }
  };

  useEffect(() => {
    // Only initialize recognition once when component mounts
    if (recognitionRef.current) {
      console.log("Recognition already initialized, skipping");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    const safeRecognition = () => {
      if (!isSpeakingRef.current && !isRecognizingRef.current) {
        startRecognition();
      } else {
        console.log("Skipping recognition start - speaking or already recognizing");
      }
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

      // Only restart if not speaking and not manually stopped
      if (!isSpeakingRef.current && isMountedRef.current) {
        console.log("Scheduling recognition restart");
        setTimeout(safeRecognition, 2000); // Increased delay to prevent rapid restarts
      }
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);
      
      // Don't restart on aborted errors (these are usually intentional stops)
      if (event.error !== "aborted" && !isSpeakingRef.current && isMountedRef.current) {
        console.log("Scheduling recognition restart after error");
        setTimeout(safeRecognition, 3000); // Longer delay after errors
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
            // Speak a fallback message
            speak("I'm sorry, I couldn't understand that. Please try again.");
          }
        } catch (error) {
          console.error("Error getting assistant response:", error);
          speak("I'm sorry, there was an error processing your request. Please try again.");
        }
      }
    };

    const fallback = setInterval(() => {
      if (!isSpeakingRef.current && !isRecognizingRef.current && isMountedRef.current) {
        console.log("Fallback: restarting recognition");
        safeRecognition();
      }
    }, 15000); // Increased interval to reduce frequency

    safeRecognition();

    return () => {
      console.log("Cleaning up recognition");
      isMountedRef.current = false;
      stopRecognition();
      setListening(false);
      isRecognizingRef.current = false;
      clearInterval(fallback);
    };
  }, []); // Remove userData dependency

  // Separate effect to handle userData changes
  useEffect(() => {
    if (userData?.assistantName) {
      console.log("User data updated, assistant name:", userData.assistantName);
    }
  }, [userData]);

  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#030353] flex flex-col justify-center items-center relative">
      {/* Buttons in top-right */}
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

      {/* Assistant Card */}
      <div className="w-[300px] h-[400px] flex flex-col items-center overflow-hidden rounded-3xl shadow-lg bg-white/10">
        <img src={userData?.assistantImage} alt="Assistant" className="h-full w-full object-cover" />
      </div>

      {/* Assistant Name */}
      <h1 className="text-white text-2xl mt-6">
        I'm <span className="font-bold">{userData?.assistantName}</span>
      </h1>

      {/* Listening status */}
      <p className="mt-4 text-sm text-gray-300">
        {listening ? "🎤 Listening..." : "🛑 Not Listening"}
      </p>

             {/* Test buttons */}
      {/*<div className="mt-4 flex gap-2">
         <button
           className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
           onClick={() => speak("Hello! This is a test of the voice system.")}
         >
           Test Voice
         </button>
         <button
           className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
           onClick={resetRecognition}
         >
           Restart Recognition
         </button>
         <button
           className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
           onClick={() => {
             stopRecognition();
             console.log("Recognition manually stopped");
           }}
         >
           Stop Recognition
         </button>
       </div>*/}
    </div>
  );
}

export default Home;
