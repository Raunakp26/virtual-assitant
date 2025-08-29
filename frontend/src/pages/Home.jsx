import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } = useContext(userDataContext);
  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const [userInteracted, setUserInteracted] = useState(process.env.NODE_ENV === 'development');
  const [toastMessage, setToastMessage] = useState(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const isMountedRef = useRef(true);
  const synth = window.speechSynthesis;

  useEffect(() => {
    if (userInteracted) return;
    const handleUserInteraction = () => {
      setUserInteracted(true);
      console.log("User interaction detected - speech enabled");
      speak("Voice assistant enabled!");
    };

    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [userInteracted]);

  const checkVoices = () => {
    const voices = synth.getVoices();
    console.log("=== AVAILABLE VOICES ===");
    voices.forEach((voice, index) => {
      console.log(`${index}: ${voice.name} (${voice.lang}) - Default: ${voice.default}`);
    });
    console.log("========================");
  };

  useEffect(() => {
    if (synth.getVoices().length > 0) {
      checkVoices();
    } else {
      synth.onvoiceschanged = checkVoices;
    }
    // Initial speech test
    setTimeout(() => {
      setUserInteracted(true); // Temporary force for testing
      speak("Welcome! I'm ready to assist you.");
    }, 1000);
  }, []);

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true });
      setUserData(null);
      navigate("/signin");
    } catch (error) {
      setUserData(null);
      console.error("Logout error:", error);
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
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          if (recognitionRef.current && !isRecognizingRef.current) {
            recognitionRef.current.start();
            console.log("Recognition start requested");
            setMicPermissionDenied(false);
          }
        })
        .catch((error) => {
          console.error("Microphone permission denied:", error);
          setMicPermissionDenied(true);
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
    setTimeout(() => {
      if (isMountedRef.current && !isSpeakingRef.current) {
        startRecognition();
      }
    }, 1000);
  };

  const speak = (text) => {
    console.log("Speaking:", text);
    console.log("User interacted:", userInteracted);
    console.log("Speech synthesis available:", 'speechSynthesis' in window);
    console.log("Current synth state:", {
      speaking: synth.speaking,
      pending: synth.pending,
      paused: synth.paused
    });

    if (!userInteracted) {
      console.log("User interaction required for speech");
      setToastMessage(`Assistant: ${text}`);
      setTimeout(() => setToastMessage(null), 7000);
      return;
    }

    if (!('speechSynthesis' in window)) {
      console.error("Speech synthesis not supported");
      setToastMessage("Speech synthesis not supported in this browser.");
      setTimeout(() => setToastMessage(null), 7000);
      return;
    }

    const attemptSpeak = (attempts = 3, delay = 1000) => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        performSpeak(voices);
      } else if (attempts > 0) {
        console.log(`No voices loaded, retrying (${attempts} attempts left)...`);
        synth.onvoiceschanged = () => {
          const voices = synth.getVoices();
          if (voices.length > 0) {
            console.log("Voices loaded, proceeding with speech");
            performSpeak(voices);
            synth.onvoiceschanged = null;
          }
        };
        setTimeout(() => attemptSpeak(attempts - 1, delay * 2), delay);
      } else {
        console.error("No voices available after retries");
        setToastMessage(`Assistant: ${text}`);
        setTimeout(() => setToastMessage(null), 7000);
      }
    };

    const performSpeak = (voices) => {
      try {
        if (synth.speaking || synth.pending) {
          synth.cancel();
          console.log("Canceled existing speech");
          setTimeout(() => performSpeak(voices), 200);
          return;
        }
      } catch (error) {
        console.error("Error canceling speech:", error);
      }

      let cleanText = text.trim();
      cleanText = cleanText.replace(/(\d{4})-(\d{2})-(\d{2})/g, (match, year, month, day) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
      });

      console.log("Clean text for speech:", cleanText);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "en-US";

      let selectedVoice = null;
      const voicePreferences = [
        (v) => v.name.includes('Google') && v.lang.startsWith('en-'),
        (v) => v.name.includes('Microsoft') && v.lang.startsWith('en-'),
        (v) => v.default && v.lang.startsWith('en-'),
        (v) => v.lang.startsWith('en-US'),
        (v) => v.lang.startsWith('en-'),
        (v) => true
      ];

      for (let preference of voicePreferences) {
        selectedVoice = voices.find(preference);
        if (selectedVoice) break;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log("Selected voice:", selectedVoice.name, selectedVoice.lang);
      } else {
        console.warn("No suitable voice found, using default");
      }

      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      isSpeakingRef.current = true;

      utterance.onstart = () => {
        console.log("✅ Speech started successfully");
        console.log("Speaking text:", cleanText);
      };

      utterance.onend = () => {
        console.log("✅ Speech ended successfully");
        isSpeakingRef.current = false;
        setTimeout(() => {
          if (!isRecognizingRef.current && isMountedRef.current) {
            console.log("Restarting recognition after speech");
            startRecognition();
          }
        }, 1000);
      };

      utterance.onerror = (event) => {
        console.error("❌ Speech error:", event.error);
        isSpeakingRef.current = false;

        if (event.error === 'not-allowed') {
          setToastMessage("Speech permission denied. Please allow speech in browser settings.");
          setTimeout(() => setToastMessage(null), 7000);
        } else if (event.error === 'network') {
          console.log("Network error, trying with local voice...");
          const localVoice = voices.find(v => v.localService === true);
          if (localVoice && utterance.voice !== localVoice) {
            utterance.voice = localVoice;
            setTimeout(() => synth.speak(utterance), 500);
            return;
          }
        } else if (event.error === 'synthesis-failed') {
          console.log("Synthesis failed, trying simpler text...");
          const simpleUtterance = new SpeechSynthesisUtterance("I have a response for you");
          synth.speak(simpleUtterance);
        }

        setTimeout(() => {
          if (!isRecognizingRef.current && isMountedRef.current) {
            console.log("Restarting recognition after speech error");
            startRecognition();
          }
        }, 1000);
      };

      try {
        console.log("🎤 Attempting to speak...");
        synth.speak(utterance);

        setTimeout(() => {
          if (isSpeakingRef.current && !synth.speaking) {
            console.warn("Speech may have failed silently");
            isSpeakingRef.current = false;
            setToastMessage(`Assistant: ${text}`);
            setTimeout(() => setToastMessage(null), 7000);
          }
        }, 3000);
      } catch (error) {
        console.error("Error starting speech:", error);
        isSpeakingRef.current = false;
        setToastMessage(`Assistant: ${text}`);
        setTimeout(() => setToastMessage(null), 7000);
      }
    };

    attemptSpeak();
  };

  const handleCommand = (data, transcript) => {
    const { type, response } = data;
    const userInput = data.userInput || transcript;

    console.log("=== HANDLING COMMAND ===");
    console.log("Type:", type);
    console.log("Response:", response);
    console.log("User Input:", userInput);
    console.log("========================");

    if (!response || response.trim() === "") {
      console.error("No response to speak!");
      speak("Sorry, I couldn't process that request.");
      return;
    }

    speak(response);

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
    if (recognitionRef.current) {
      console.log("Recognition already initialized, skipping");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser");
      setToastMessage("Speech recognition not supported. Please use Chrome or Firefox.");
      setTimeout(() => setToastMessage(null), 7000);
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

      if (!isSpeakingRef.current && isMountedRef.current) {
        console.log("Scheduling recognition restart");
        setTimeout(safeRecognition, 1500);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);

      if (event.error === 'no-speech') {
        console.log("No speech detected, will retry...");
      } else if (event.error === 'audio-capture' || event.error === 'not-allowed') {
        console.error("Microphone error:", event.error);
        setMicPermissionDenied(true);
        return;
      }

      if (event.error !== "aborted" && 
          event.error !== "not-allowed" && 
          event.error !== "audio-capture" && 
          !isSpeakingRef.current && 
          isMountedRef.current) {
        console.log("Scheduling recognition restart after error");
        setTimeout(safeRecognition, 1500);
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

    const fallbackInterval = setInterval(() => {
      if (!isSpeakingRef.current && !isRecognizingRef.current && isMountedRef.current) {
        console.log("Fallback: restarting recognition");
        safeRecognition();
      }
    }, 10000);

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

  useEffect(() => {
    if (userData?.assistantName) {
      console.log("User data updated, assistant name:", userData.assistantName);
    }
  }, [userData]);

  return (
    <div className="w-full h-screen bg-gradient-to-t from-black to-[#030353] flex flex-col justify-center items-center relative">
      {!userInteracted && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-6 py-3 rounded-lg shadow-lg animate-pulse flex items-center gap-3">
          <span>Click or tap to enable voice assistant</span>
          <button
            className="px-4 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
            onClick={() => {
              setUserInteracted(true);
              speak("Voice assistant enabled!");
            }}
          >
            Enable Voice
          </button>
        </div>
      )}

      {micPermissionDenied && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          Microphone access denied. Please allow microphone in browser settings.
        </div>
      )}

      {toastMessage && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg max-w-md text-center">
          {toastMessage}
        </div>
      )}

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

      <div className="w-[300px] h-[400px] flex flex-col items-center overflow-hidden rounded-3xl shadow-lg bg-white/10">
        <img src={userData?.assistantImage} alt="Assistant" className="h-full w-full object-cover" />
      </div>

      <h1 className="text-white text-2xl mt-6">
        I'm <span className="font-bold">{userData?.assistantName}</span>
      </h1>

      <p className="mt-4 text-sm text-gray-300">
        {listening ? "🎤 Listening..." : "🛑 Not Listening"}
      </p>

      <div className="mt-2 text-xs text-gray-400">
        {!userInteracted && "Waiting for user interaction..."}
        {userInteracted && !listening && "Ready to listen"}
        {userInteracted && listening && `Listening for "${userData?.assistantName}"...`}
      </div>

      <div className="absolute bottom-6 left-6 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
            onClick={() => {
              setUserInteracted(true);
              speak("Hello! This is a test of the voice system.");
            }}
          >
            Test Voice
          </button>
          <button
            className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition"
            onClick={() => {
              setUserInteracted(true);
              speak("Current date is August 29, 2025");
            }}
          >
            Test Date Speech
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition"
            onClick={resetRecognition}
          >
            Reset Recognition
          </button>
          <button
            className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition"
            onClick={() => {
              const voices = synth.getVoices();
              console.log("=== CURRENT VOICE STATUS ===");
              console.log("Voices available:", voices.length);
              console.log("Synth speaking:", synth.speaking);
              console.log("Synth pending:", synth.pending);
              console.log("User interacted:", userInteracted);
              console.log("Is speaking ref:", isSpeakingRef.current);
              voices.forEach((voice, i) => {
                if (i < 5) console.log(`${i}: ${voice.name} (${voice.lang})`);
              });
              console.log("=========================");
            }}
          >
            Debug Info
          </button>
          <button
            className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition"
            onClick={() => {
              setUserInteracted(true);
              speak("Forced speech test to ensure audio works!");
            }}
          >
            Force Speak
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
