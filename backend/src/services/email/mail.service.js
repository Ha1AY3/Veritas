import axios from "axios";

export async function sendEmail({ to, subject, text, html }) {
    try {
        const response = await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender: {
                    name: "Veritas",
                    email: process.env.GMAIL_USER
                },
                to: [{ email: to }],
                subject,
                htmlContent: html || text
            },
            {
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Email sent:", response.data.messageId);
        return response.data;
    } catch (err) {
        console.error("Brevo error:", err.response?.data || err.message);
        throw err;
    }
}