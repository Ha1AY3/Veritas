import {body, validationResult} from "express-validator"

function validate(req, res, next){
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        return res.status(400).json({
            errors: errors.array()
        })
    }

    next();
}

export const registerValidator = [
    body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({min: 4, max: 20}).withMessage("Username must be between 4 and 20 characters")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username can only contain letters, numbers, and underscores"),

    body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email"),

    body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({min: 6}).withMessage("Password must be atleast 6 characters"),

    validate
];

export const loginValidator = [
    body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email"),

    body("password")
    .notEmpty().withMessage("Password is required"),

    validate
];