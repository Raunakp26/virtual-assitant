import React, { useContext, useRef } from "react";
import Card from "../components/card.jsx";
import image1 from "../assets/image1.png";
import image2 from "../assets/image2.jpg";
import image3 from "../assets/authBg.png";
import image4 from "../assets/image4.png";
import image5 from "../assets/image5.png";
import image6 from "../assets/image6.jpeg";
import { MdKeyboardBackspace } from 'react-icons/md';
import { RiImageAddLine } from "react-icons/ri";
import { userDataContext } from "../context/UserContext.jsx";
import { useNavigate } from "react-router-dom";

function Customize() {
  const {
    serverUrl,
    userData,
    setUserData,
    backendImage,
    setBackendImage,
    frontendImage,
    setFrontendImage,
    selectedImage,
    setSelectedImage,
  } = useContext(userDataContext);

  const inputImage = useRef();
  const navigate = useNavigate();

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackendImage(file);
      setFrontendImage(URL.createObjectURL(file));
      setSelectedImage("input");
    }
  };

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-black to-[#030353] flex flex-col justify-center items-center p-[20px]">
      <h1 className="text-white mb-[30px] text-[30px] text-center">
        Select your <span>Assistant Image</span>
      </h1>
      <MdKeyboardBackspace
      className='absolute top-[30px] left-[30px] text-white cursor-pointer w-[25px] h-[25px]'
      onClick={() => navigate("/")}
    />

      <div className="w-full max-w-[900px] flex justify-center items-center flex-wrap gap-[15px]">
        {/* Predefined image cards */}
<Card image={image1} id="image1" />
<Card image={image2} id="image2" />
<Card image={image3} id="image3" />
<Card image={image4} id="image4" />
<Card image={image5} id="image5" />
<Card image={image6} id="image6" />



        {/* Add new image card */}
        <div
          className={`w-[70px] h-[140px] lg:w-[150px] lg:h-[250px] 
            bg-[#020220] border-2 border-[#0000ff66] rounded-2xl 
            overflow-hidden hover:shadow-2xl hover:shadow-blue-950 
            cursor-pointer hover:border-4 hover:border-white 
            flex items-center justify-center ${
              selectedImage === "input"
                ? "border-4 border-white shadow-2xl shadow-blue-950"
                : ""
            }`}
          onClick={() => inputImage.current.click()}
        >
          {!frontendImage && (
            <RiImageAddLine className="text-white w-[30px] h-[30px]" />
          )}
          {frontendImage && (
            <img
              src={frontendImage}
              alt="preview"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          accept="image/*"
          ref={inputImage}
          className="hidden"
          onChange={handleImage}
        />
      </div>
{console.log("selectedImage:", selectedImage)}

      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white rounded-full disabled:opacity-50"
        disabled={!selectedImage}
        onClick={() => {
          if (selectedImage) {
            navigate("/customize2"); 
          } else {
            alert("Please select an image first!");
          }
        }}
      >
        Next
      </button>
    </div>
  );
}

export default Customize;
