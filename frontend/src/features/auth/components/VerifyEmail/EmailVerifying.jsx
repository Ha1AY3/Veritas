import { LoaderCircle } from "lucide-react";

const EmailVerifying = () => {

    return (

        <div className="email-content">

            <LoaderCircle className="loader-icon" />

            <h1>Email Verification</h1>

            <p>
                Veritas is verifying your email.
                This usually takes only a few seconds.
            </p>

        </div>

    );

};

export default EmailVerifying;