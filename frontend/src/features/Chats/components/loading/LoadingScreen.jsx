import "./loadingScreen.scss";
import logo from "../../../../assets/logo.png";

export default function LoadingScreen() {
    return (
        <div className="veritas-loading">
            <div className="veritas-loading-glow" />

            <div className="veritas-loading-content">
                <div className="veritas-logo-mark">
                    <img src={logo} alt="Veritas" />
                </div>

                <div className="veritas-loading-name">
                    Veritas
                </div>

                <div className="veritas-loading-line">
                    <span />
                </div>

                <div className="veritas-loading-text">
                    Preparing your research environment
                </div>
            </div>
        </div>
    );
}