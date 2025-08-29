import React, { useEffect, useState, useRef } from "react";

const Home = () => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser 😢");
      return;
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = false;
    recog.lang = "en-US";
    recognitionRef.current = recog;

    recog.onstart = () => {
      console.log("Recognition started ✅");
      setIsListening(true);
    };

    recog.onend = () => {
      console.log("Recognition ended ❌ restarting...");
      if (isListening) setTimeout(() => recog.start(), 300); // thoda delay diya
    };

    recog.onerror = (event) => {
      console.error("Recognition error:", event.error);
      if (event.error === "not-allowed") {
        alert("Mic permission allow karo! 🎤");
      }
    };

    recog.onresult = (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript.trim();
      console.log("User said:", transcript);
      handleCommand(transcript);
    };

    // ek bar click karne par start hoga
    const handler = () => {
      recog.start();
      window.removeEventListener("click", handler);
    };
    window.addEventListener("click", handler);

    return () => {
      window.removeEventListener("click", handler);
      recog.stop();
    };
  }, [isListening]);

  const speak = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = synthRef.current
      .getVoices()
      .find((voice) => voice.lang === "en-US" || voice.name.includes("David"));
    synthRef.current.cancel(); // pehle se bol raha hai to stop
    synthRef.current.speak(utterance);
    console.log("Speaking:", text);
  };

  const handleCommand = (command) => {
    let response = "Sorry, I didn’t understand that.";

    if (command.toLowerCase().includes("hello") || command.toLowerCase().includes("hi")) {
      response = "Hello there! How can I help you today?";
    } else if (command.toLowerCase().includes("time")) {
      response = "The current time is " + new Date().toLocaleTimeString();
    } else if (command.toLowerCase().includes("date")) {
      response = "Today's date is " + new Date().toLocaleDateString();
    }

    speak(response);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4">🧠 Jarvis AI Assistant</h1>
      <p className="text-lg">
        {isListening ? "🎙️ Listening..." : "Click anywhere to activate 🎤"}
      </p>
    </div>
  );
};

export default Home;
