// src/pages/Home.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } = useContext(userDataContext);
  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const isMountedRef = useRef(true);
  const synth = window.speechSynthesis;

  // Track user interaction for autoplay policy compliance
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserInteracted(true);
      console.log("User interaction detected - speech enabled");
    };

    // Listen for any user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

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
    if (!recognitionRef.current) {
      console.log("Recognition not initialized, skipping start");
      return;
    }

    if (isRecognizingRef.current) {
      console.log("Recognition already running, skipping start");
      return;
    }
    
    if (isSpeakingRef.current) {
      console.log("Currently speaking, skipping recognition start");
      return;
    }

    try {
      // Request microphone permission first
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          if (recognitionRef.current && !isRecognizingRef.current) {
            recognitionRef.current.start();
            console.log("Recognition start requested");
          }
        })
        .catch((error) => {
          console.error("Microphone permission denied:", error);
          // Show user-friendly message
          alert("कृपया microphone permission दें voice assistant के लिए");
        });
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Recognition start error:", error);
      }
    }
  };

  const stopRecognition = () => {
    if (isRecognizingRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
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
    
    // Check if user has interacted first (for autoplay policy)
    if (!userInteracted) {
      console.log("User interaction required for speech");
      // Show text instead or request interaction
      alert(`Assistant says: ${text}`);
      return;
    }

    // Check if speech synthesis is available
    if (!('speechSynthesis' in window)) {
      console.error("Speech synthesis not supported");
      alert(`Assistant says: ${text}`);
      return;
    }
    
    // Cancel any ongoing speech
    try {
      synth.cancel();
    } catch (error) {
      console.error("Error canceling speech:", error);
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    
    // Try to select an English voice
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
      // Restart recognition after speech completes
      setTimeout(() => {
        if (!isRecognizingRef.current && isMountedRef.current) {
          console.log("Restarting recognition after speech");
          startRecognition();
        }
      }, 1500);
    };
    
    utterance.onerror = (event) => {
      console.error("Speech error:", event.error);
      isSpeakingRef.current = false;
      
      // Handle different speech errors
      if (event.error === 'not-allowed') {
        alert("Speech permission denied. कृपया browser settings में speech को allow करें");
      } else if (event.error === 'network') {
        console.log("Network error, trying again...");
      }
      
      // Always restart recognition after error
      setTimeout(() => {
        if (!isRecognizingRef.current && isMountedRef.current) {
          console.log("Restarting recognition after speech error");
          startRecognition();
        }
      }, 1000);
    };

    try {
      synth.speak(utterance);
    } catch (error) {
      console.error("Error starting speech:", error);
      isSpeakingRef.current = false;
      alert(`Assistant says: ${text}`);
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

    // Check if response exists and is not empty
    if (!response || response.trim() === "") {
      console.error("No response to speak!");
      speak("Sorry, I couldn't process that request.");
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

    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser");
      alert("Speech recognition is not supported in this browser. कृपया Chrome या Firefox का उपयोग करें।");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognitionRef.current = recognition;

    const safeRecognition = () => {
      if (!isSpeakingRef.current && !isRecognizingRef.current && isMountedRef.current) {
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

      // Only restart if not speaking and component is still mounted
      if (!isSpeakingRef.current && isMountedRef.current) {
        console.log("Scheduling recognition restart");
        setTimeout(safeRecognition, 2000);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);
      
      // Handle different recognition errors
      if (event.error === 'no-speech') {
        console.log("No speech detected, will retry...");
      } else if (event.error === 'audio-capture') {
        console.error("No microphone found or permission denied");
        alert("Microphone नहीं मिला या permission नहीं मिली। कृपया microphone को allow करें।");
        return; // Don't restart on audio-capture errors
      } else if (event.error === 'not-allowed') {
        console.error("Microphone permission denied");
        alert("Microphone permission denied. कृपया browser settings में microphone को allow करें।");
        return; // Don't restart on permission errors
      }
      
      // Restart recognition for recoverable errors
      if (event.error !== "aborted" && 
          event.error !== "not-allowed" && 
          event.error !== "audio-capture" && 
          !isSpeakingRef.current && 
          isMountedRef.current) {
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

    // Fallback mechanism to ensure recognition keeps running
    const fallbackInterval = setInterval(() => {
      if (!isSpeakingRef.current && !isRecognizingRef.current && isMountedRef.current) {
        console.log("Fallback: restarting recognition");
        safeRecognition();
      }
    }, 15000);

    // Start recognition after a delay to ensure everything is initialized
    setTimeout(() => {
      if (isMountedRef.current) {
        safeRecognition();
      }
    }, 1000);

    return () => {
      console.log("Cleaning up recognition");
      isMountedRef.current = false;
      clearInterval(fallbackInterval);
      stopRecognition();
      setListening(false);
      isRecognizingRef.current = false;
      
      // Clean up recognition reference
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.log("Error aborting recognition:", error);
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  // Separate effect to handle userData changes
  useEffect(() => {
    if (userData?.assistantName) {
      console.log("User data updated, assistant name:", userData.assistantName);
    }
  }, [userData]);

  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#030353] flex flex-col justify-center items-center relative">
      {/* User interaction prompt */}
      {!userInteracted && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg">
          Click anywhere to enable voice features
        </div>
      )}

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

      {/* Status indicator */}
      <div className="mt-2 text-xs text-gray-400">
        {!userInteracted && "Waiting for user interaction..."}
        {userInteracted && !listening && "Ready to listen"}
        {userInteracted && listening && `Listening for "${userData?.assistantName}"...`}
      </div>

      {/* Emergency controls - only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-6 left-6 flex gap-2">
          <button
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
            onClick={() => speak("Hello! This is a test of the voice system.")}
          >
            Test Voice
          </button>
          <button
            className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition"
            onClick={resetRecognition}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

export default Home;
