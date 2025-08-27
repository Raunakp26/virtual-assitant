import genToken from "../config/token.js";
import User from "../model/user.model.js";
import bcrypt from 'bcryptjs';
//for authenthication
 export const signup=async(req,res)=>{
    try{
      const{name,email,password}=req.body;
      const exitEmail=await User.findOne({email})
      if(exitEmail){
        return res.status(400).json({message:"email already exist"})
      }

      if(password.length<6){
        return res.status(400).json({message:"passwird atleast 6 chracter"})

      }
     const hashedPassword=await bcrypt.hash(password,10)
      const user=await User.create({
        name,password:hashedPassword,email
      })
 const token=await genToken(user._id)
  res.cookie("token",token,{
 httpOnly:true,
 maxAge:30*24*60*60*1000,
 sameSite:"None",
 secure:true
  })

return res.status(201).json(user)

    }catch(error){
        console.error("Signup error:", error);
        if (error.message.includes("JWT_SECRET")) {
            return res.status(500).json({message:"Server configuration error"})
        }
return res.status(500).json({message:`sign up error ${error.message}`})
    }
}

export const login=async(req,res)=>{
    try{
      const{email,password}=req.body;
      const user=await User.findOne({email})
      if(!user){
        return res.status(400).json({message:"email doesnot exist"})
      }
const isMatch=await bcrypt.compare(password,user.password)
     if(!isMatch){
      return res.status(400).json({message:"incorrect password"})
     }
   
 const token=await genToken(user._id)
  res.cookie("token",token,{
 httpOnly:true,
 maxAge:30*24*60*60*1000,
 sameSite:"None",
 secure:true
  })

return res.status(200).json(user)

    }catch(error){
        console.error("Login error:", error);
        if (error.message.includes("JWT_SECRET")) {
            return res.status(500).json({message:"Server configuration error"})
        }
return res.status(500).json({message:`login error ${error.message}`})
    }
}
 export const logout =async (req,res)=>{
    try{
res.clearCookie("token", { sameSite: "lax", secure: false });

 return res.status(201).json({message:"logout succesfully"})
    }
    catch(error){
      return res.status(500).json({message:`logout error ${error}`})
    }
 }
