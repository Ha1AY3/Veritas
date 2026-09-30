import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.GOOGLE_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
})

transporter.verify((error, success) => {
    if(error){
        console.error("Error connecting to email server", error);
    }else{
        console.log("Connected to email server");
    }
})

export async function sendEmail({to, subject,text, html}){
    const mailOptions = ({
        from: process.env.GOOGLE_USER, 
        to, 
        subject, 
        html,
        text
    })

    const details = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", details);
}