import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { userDataContext } from "./context/UserContext.jsx";
import SignUp from "./pages/Signup";
import SignIn from "./pages/Signin";
import Customize from "./pages/Customize.jsx";
import Customize2 from "./pages/Customize2.jsx"
import Home from "./pages/Home";  

function App() {
  const { userData } = useContext(userDataContext);

  return (
    <Routes>
      <Route
        path="/"
        element={
          userData?.assistantImage && userData?.assistantName
            ? <Home />
            : <Navigate to="/customize" />
        }
      />
      <Route
        path="/signup"
        element={!userData ? <SignUp /> : <Navigate to="/" />}
      />
      <Route
        path="/signin"
        element={!userData ? <SignIn /> : <Navigate to="/" />}
      />
      <Route
        path="/customize"
        element={userData ? <Customize /> : <Navigate to="/signup" />}
      />
      <Route
        path="/customize2"
        element={userData ? <Customize2 /> : <Navigate to="/signup" />}
      />
    </Routes>
  );
}

export default App;
