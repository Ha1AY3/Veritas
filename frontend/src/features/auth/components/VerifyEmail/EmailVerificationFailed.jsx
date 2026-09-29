import { CircleX } from "lucide-react";
import { Link } from "react-router";

const EmailVerificationFailed = () => {

    return (

        <div className="email-content">

            <CircleX className="error-icon" />

            <h1>Verification Failed</h1>

            <p>
                This verification link is invalid
                or has expired.
            </p>

            <Link to="/register">

                <button className="email-btn">

                    Back to Register

                </button>

            </Link>

        </div>

    );

};

export default EmailVerificationFailed;