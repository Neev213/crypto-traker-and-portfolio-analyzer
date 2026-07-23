import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/axios";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
  });
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (avatar) fd.append("avatar", avatar);
      await register(fd);
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen mesh-bg">
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
          <h2 className="mt-8 font-display text-3xl font-bold text-white">Create account</h2>
          <p className="mt-2 text-zinc-500">Start tracking your crypto portfolio today</p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-4">
            <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-400">Avatar (optional)</span>
              <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0])} className="w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-4 file:py-2 file:text-cyan-400" />
            </label>
          </div>

          <Button type="submit" className="mt-6 w-full" loading={loading}>
            Create account
          </Button>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link to="/login" className="text-cyan-400 hover:underline">Sign in</Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
