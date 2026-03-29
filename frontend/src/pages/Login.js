import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Wrench, Eye, EyeOff, AlertCircle } from "lucide-react";

const BG_IMG = "https://images.unsplash.com/photo-1727893119356-1702fe921cf9?crop=entropy&cs=srgb&fm=jpg&q=85&w=800";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const formatError = (detail) => {
    if (!detail) return "Erro ao fazer login";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map(e => e.msg || String(e)).join("; ");
    return String(detail);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "admin") navigate("/admin/dashboard");
      else navigate("/mechanic/dashboard");
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Left panel - image (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src={BG_IMG} alt="Oficina" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-slate-900/60 flex flex-col justify-end p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Wrench size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>AutoGestão</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Outfit' }}>
            Gerencie sua oficina com inteligência
          </h2>
          <p className="text-slate-300 text-base leading-relaxed">
            Controle de serviços, comissões automáticas e relatórios completos.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Wrench size={18} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>AutoGestão</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>Bem-vindo de volta</h1>
            <p className="text-slate-500 text-sm mb-8">Faça login para acessar sua conta</p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-6" data-testid="login-error">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 bg-white transition-fast"
                  data-testid="login-email"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-12 px-4 pr-12 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 bg-white transition-fast"
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100"
                  >
                    {showPassword ? <EyeOff size={18} className="text-slate-400" /> : <Eye size={18} className="text-slate-400" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-fast"
                data-testid="login-submit"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Entrando...
                  </div>
                ) : "Entrar"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Não tem conta?{" "}
              <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700" data-testid="register-link">
                Cadastrar oficina
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
