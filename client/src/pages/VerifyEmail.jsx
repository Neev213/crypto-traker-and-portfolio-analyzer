import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getErrorMessage } from "../api/axios";
import { authApi } from "../api/services";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import toast from "react-hot-toast";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email");
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!emailParam) {
      navigate("/login");
    }
  }, [emailParam, navigate]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    
    setLoading(true);
    try {
      await authApi.verifyEmail({ email: emailParam, otp });
      toast.success("Email verified successfully! You can now log in.");
      navigate("/login");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await authApi.resendVerification(emailParam);
      toast.success("A new verification code has been sent!");
      setCooldown(60); // 60 second cooldown
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  if (!emailParam) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-6 mesh-bg">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
      >
        <div className="mb-8 text-center">
          <Link to="/" className="font-display text-2xl font-bold gradient-text inline-block">
            CryptoVault
          </Link>
          <h2 className="mt-6 font-display text-2xl font-bold text-white">Verify your email</h2>
          <p className="mt-2 text-zinc-400">
            We've sent a 6-digit verification code to <span className="font-medium text-white">{emailParam}</span>.
          </p>
        </div>

        <div className="space-y-6">
          <Input
            label="Verification Code"
            type="text"
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />
          <Button type="submit" className="w-full" loading={loading}>
            Verify Email
          </Button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-sm text-cyan-400 hover:underline disabled:text-zinc-500 disabled:no-underline disabled:cursor-not-allowed"
            >
              {resending ? "Sending..." : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend verification code"}
            </button>
          </div>

          <p className="text-center text-sm text-zinc-500 border-t border-white/5 pt-6 mt-6">
            Wrong email?{" "}
            <Link to="/register" className="text-cyan-400 hover:underline">
              Create a new account
            </Link>
          </p>
        </div>
      </motion.form>
    </div>
  );
}
