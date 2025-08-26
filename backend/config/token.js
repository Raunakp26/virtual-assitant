import jwt from 'jsonwebtoken'
const genToken=async(userId)=>{
    try{
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }

        const token=await jwt.sign({userId},process.env.JWT_SECRET
        ,{expiresIn:"30d"})
        return token;
    }catch(error){
        console.error("Token generation error:", error);
        throw error;
    }
}

export default genToken;