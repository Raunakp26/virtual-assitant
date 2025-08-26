import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userDataContext } from "../context/UserContext.jsx";
import { MdKeyboardBackspace } from 'react-icons/md';

import axios from "axios";
import image1 from "../assets/image1.png";
import image2 from "../assets/image2.jpg";
import image3 from "../assets/authBg.png";
import image4 from "../assets/image4.png";
import image5 from "../assets/image5.png";
import image6 from "../assets/image6.jpeg";

function Customize2() {
  const { serverUrl, userData, backendImage, selectedImage, setUserData, refreshUser } =
    useContext(userDataContext);
  const navigate = useNavigate();
  const [assistantName, setAssistantName] = useState(
    userData?.assistantName || ""
  );
  const [loading, setLoading] = useState(false);

  // Image URL mapping
  const imageUrlMap = {
    image1: image1,
    image2: image2,
    image3: image3,
    image4: image4,
    image5: image5,
    image6: image6
  };

  // Update assistantName when userData changes
  useEffect(() => {
    if (userData?.assistantName) {
      setAssistantName(userData.assistantName);
    }
  }, [userData]);

  console.log("Current assistantName state:", assistantName);
  console.log("Current userData:", userData);
  console.log("Selected Image ID:", selectedImage);
  console.log("Backend Image:", backendImage);
  console.log("Image URL from map:", imageUrlMap[selectedImage]);

  const handleUpdateAssistant = async () => {
    try {
      setLoading(true);
      
      // Log assistant data before sending
      console.log("=== ASSISTANT CREATION DATA ===");
      console.log("Assistant Name:", assistantName);
      console.log("Assistant Name Type:", typeof assistantName);
      console.log("Assistant Name Length:", assistantName?.length);
      console.log("Selected Image ID:", selectedImage);
      console.log("Backend Image:", backendImage);
      console.log("Image URL from map:", imageUrlMap[selectedImage]);
      console.log("Image Processing Type:", backendImage ? "File Upload" : "Predefined Image");
      console.log("Current User Data:", userData);
      console.log("User Email:", userData?.email);
      console.log("User Name:", userData?.name);
      console.log("User ID:", userData?._id);
      console.log("User Assistant Name:", userData?.assistantName);
      console.log("================================");
      
      // Prepare FormData
      const formData = new FormData();
      formData.append("assistantName", assistantName);
      
      if (backendImage) {
        // If user uploaded a custom image
        formData.append("assistantImage", backendImage);
        console.log("Sending uploaded file:", backendImage.name);
      } else if (selectedImage && selectedImage !== "input") {
        // If user selected a predefined image
        const imageUrl = imageUrlMap[selectedImage];
        formData.append("imageUrl", imageUrl);
        console.log("Sending predefined image URL:", imageUrl);
      } else {
        console.log("No image selected");
      }

      // Send request with cookies (same as UserContext)
      const result = await axios.post(
        `${serverUrl}/api/user/update`,
        formData,
        {
          withCredentials: true, // Use cookies instead of Bearer token
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("=== ASSISTANT CREATED SUCCESSFULLY ===");
      console.log("Complete Updated User Object:", result.data);
      console.log("Assistant Name:", result.data.assistantName);
      console.log("Assistant Image:", result.data.assistantImage || result.data.imageUrl);
      console.log("User Email:", result.data.email);
      console.log("User Name:", result.data.name);
      console.log("User ID:", result.data._id);
      console.log("User History:", result.data.history);
      console.log("Created At:", result.data.createdAt);
      console.log("Updated At:", result.data.updatedAt);
      console.log("Version:", result.data.__v);
      console.log("Creation Time:", new Date().toLocaleString());
      console.log("=====================================");
      
      setUserData(result.data);
      alert("Assistant updated successfully!");
       navigate("/"); // optional
    } catch (error) {
      console.error("=== ASSISTANT CREATION ERROR ===");
      console.error("Error:", error);
      console.error("Error Response:", error.response?.data);
      console.error("Error Status:", error.response?.status);
      console.error("Error Message:", error.message);
      console.error("===============================");
      
      if (error.response?.status === 401) {
        alert("Unauthorized. Your session may have expired. Please login again.");
        // Refresh user data to check authentication status
        refreshUser();
      
        
      } else {
        console.error("Error updating assistant:", error);
        alert("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-black to-[#030353] flex justify-center items-center flex-col p-[20px] relative'>
    <MdKeyboardBackspace
      className='absolute top-[30px] left-[30px] text-white cursor-pointer w-[25px] h-[25px]'
      onClick={() => navigate("/customize")}
    />

  
    
      <input
        type="text"
        placeholder="eg. shifra"
        className="w-full max-w-[600px] h-[60px] outline-none border-2 border-white bg-transparent text-white placeholder-gray-300 px-[20px] py-[10px] rounded-full text-[18px]"
        required
        onChange={(e) => setAssistantName(e.target.value)}
        value={assistantName}
      />
      {assistantName && (
        <button
          className={`min-w-[300px] h-[60px] mt-[30px] text-black font-semibold cursor-pointer bg-white rounded-full text-[19px] ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleUpdateAssistant}
          disabled={loading}
        >
          {loading ? "Updating..." : "Finally Create Your Assistant"}
        </button>
      )}
    </div>
  );
}

export default Customize2;