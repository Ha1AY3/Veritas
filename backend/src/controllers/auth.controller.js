import { compare } from "bcryptjs";
import userModel from "../models/user.model.js";
import { sendEmail } from "../services/email/mail.service.js";
import jwt from "jsonwebtoken";


export async function registerController(req, res){
    const { username, email, password } = req.body;

    const isUserAlreadyExists = await userModel.findOne({
        $or: [{username}, {email}]
    });

    if(isUserAlreadyExists){
        return res.status(400).json({
            message: "Username or email already exists",
            success: false,
            err: "User already exists"
        })
    }

    const user = await userModel.create({
        username,
        email,
        password
    });

    const emailVerificationToken = jwt.sign({
        email: user.email
    }, process.env.JWT_SECRET);

    await sendEmail({
        to: email,
        subject: "Welcome to Veritas",
        html: `<h1>Hi ${username}</h1>
               <p>Thank you for registering with us. We are excited to have you on board!</p>
               <p>To verify your email, please click the following link: <a href="${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}">Verify Email</a></p>
               <p>Best regards,</p><p>The Veritas Team</p>`
    })

    res.status(201).json({
        message: "User registered successfully",
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

export async function verifyEmailController(req, res){
    const { token } = req.query;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findOne({ email: decoded.email});

    if(!user){
        return res.status(400).json({
            message: "Invalid token",
            success: false,
            err: "User not found"
        })
    }

    user.isVerified = true;

    await user.save();

    res.status(200).json({
        message: "Email verified successfully",
        success: true
    })
}

export async function loginController(req, res){
    const { email, password } = req.body;

    const user = await userModel.findOne({email});

    if(!user){
        return res.status(400).json({
            message: "Invalid email or password",
            success: false,
            err: "User not found"
        })
    }

    const isPasswordMatched = await user.comparePassword(password);

    if(!isPasswordMatched){
        return res.status(400).json({
            message: "Invalid email or password",
            success: false,
            err: "Invalid password"
        })
    }

    if(!user.isVerified){
        return res.status(400).json({
            message: "Please verify your email before logging in",
            success: false,
            err: "Email not verified"
        })
    }

    const token = jwt.sign({
        id: user._id,
        username: user.username
    },
    process.env.JWT_SECRET, {
        expiresIn: "7d"
    });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    res.status(200).json({
        message: "User logged in successfully",
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

export async function getMeController(req, res){
    const userId = req.user.id;

    const user = await userModel.findById(userId).select("-password");

    if(!user){
        return res.status(404).json({
            message: "User not found",
            success: false,
            err: "User not found"
        })
    }

    res.status(200).json({
        message: "User details fetched successfully",
        success: true,
        user
    })
}

export function logoutController(req, res) {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
}