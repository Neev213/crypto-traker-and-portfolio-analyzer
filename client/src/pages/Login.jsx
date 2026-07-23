import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/axios";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes("verify your email")) {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen mesh-bg">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden w-1/2 flex-col justify-center border-r border-white/5 bg-gradient-to-br from-cyan-500/10 to-violet-600/10 p-16 lg:flex"
      >
        <h1 className="font-display text-4xl font-bold text-white">
          Welcome back to <span className="gradient-text">CryptoVault</span>
        </h1>
        <p className="mt-4 max-w-md text-zinc-400">
          Access your portfolio analytics, watchlist, and price alerts in one dashboard.
        </p>
      </motion.div>

      <div className="flex flex-1 items-center justify-center p-6">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="w-full max-w-md"
        >
          <Link to="/" className="font-display text-2xl font-bold gradient-text">
            CryptoVault
          </Link>
          <h2 className="mt-8 font-display text-3xl font-bold text-white">Sign in</h2>
          <p className="mt-2 text-zinc-500">Enter your credentials to continue</p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-cyan-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" loading={loading}>
            Sign in
          </Button>

          <p className="mt-6 text-center text-sm text-zinc-500">
            No account?{" "}
            <Link to="/register" className="text-cyan-400 hover:underline">
              Create one
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
