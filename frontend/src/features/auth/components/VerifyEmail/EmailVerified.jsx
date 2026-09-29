import { CircleCheckBig } from "lucide-react";
import { Link } from "react-router";

const EmailVerified = () => {

    return (

        <div className="email-content">

            <CircleCheckBig className="success-icon" />

            <h1>Verification Complete</h1>

            <p>
                Your email has been verified successfully.
                You can now start using Veritas.
            </p>

            <Link to="/login">

                <button className="email-btn">

                    Continue to Login

                </button>

            </Link>

        </div>

    );

};

export default EmailVerified;