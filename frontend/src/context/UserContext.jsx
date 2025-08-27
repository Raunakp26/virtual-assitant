import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const userDataContext = createContext();

function UserContext({ children }) {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const serverUrl = "https://virtual-assitantbackend.onrender.com";
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleCurrentUser = async () => {
    try {
      setIsLoading(true);
      const result = await axios.get(`${serverUrl}/api/user/current`, { 
        withCredentials: true 
      });
      setUserData(result.data);
      setIsAuthenticated(true);
      console.log("=== USER DATA LOADED ===");
      console.log("User Data:", result.data);
      console.log("User Email:", result.data.email);
      console.log("User Name:", result.data.name);
      console.log("User ID:", result.data._id);
      console.log("Assistant Name:", result.data.assistantName);
      console.log("Assistant Image:", result.data.assistantImage);
      console.log("=======================");
    } catch (error) {
      console.log("Authentication error:", error.response?.status, error.response?.data);
      
      if (error.response?.status === 401) {
        // User is not authenticated
        setUserData(null);
        setIsAuthenticated(false);
        console.log("User not authenticated - please log in");
      } else {
        console.error("Other error:", error);
        setUserData(null);
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle login (call this after successful login)
  const refreshUser = () => {
    handleCurrentUser();
  };

  // Function to handle logout
  const logout = async () => {
    try {
      // Call logout endpoint if you have one
      await axios.post(`${serverUrl}/api/auth/logout`, {}, { 
        withCredentials: true 
      });
    } catch (error) {
      console.log("Logout error:", error);
    } finally {
      // Clear user data regardless of logout endpoint success
      setUserData(null);
      setIsAuthenticated(false);
    }
  };
  const getGeminiResponse = async (command) => {
    try {
      console.log("=== FRONTEND: SENDING COMMAND ===");
      console.log("Command:", command);
      console.log("Server URL:", serverUrl);
      
      const result = await axios.post(
        `${serverUrl}/api/user/asktoassistant`,
        { command },
        { withCredentials: true }
      );
      
      console.log("=== FRONTEND: RESPONSE RECEIVED ===");
      console.log("Response:", result.data);
      return result.data;
    } catch (error) {
      console.error("=== FRONTEND: ERROR DETAILS ===");
      console.error("Error:", error);
      console.error("Error message:", error.message);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("===============================");
      return null;
    }
  }
  

  useEffect(() => {
    handleCurrentUser();
  }, []);

  const value = {
    serverUrl,
    userData,
    setUserData,
    isLoading,
    isAuthenticated,
    refreshUser,
    logout,
    backendImage, 
    setBackendImage,
    frontendImage, 
    setFrontendImage,
    selectedImage,
    setSelectedImage,
    getGeminiResponse
  };

  return (
    <userDataContext.Provider value={value}>
      {children}
    </userDataContext.Provider>
  );
}

export default UserContext;
