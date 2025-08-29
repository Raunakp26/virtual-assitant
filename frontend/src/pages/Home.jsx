import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const serverUrl = import.meta.env.VITE_SERVER_URL;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/user/current`, {
          withCredentials: true,
        });
        setUserData(res.data);
      } catch (error) {
        console.log("Auth error:", error);
        setUserData(null);
      }
    };

    fetchUser();
  }, [serverUrl]);

  // 👇 ye missing tha, isliye error aa rahi thi
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

  return (
    <div className="home-container">
      <h1>Welcome to Jarvis</h1>
      {userData ? (
        <div>
          <p>Hello, {userData.username}!</p>
          <button onClick={handleLogOut}>Logout</button>
        </div>
      ) : (
        <div>
          <p>You are not logged in.</p>
          <button onClick={() => navigate("/signin")}>Sign In</button>
        </div>
      )}
    </div>
  );
};

export default Home;
