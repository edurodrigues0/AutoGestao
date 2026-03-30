import { useState } from "react";
import { MechanicLayout } from "../components/Layout";
import { Lock, Save, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MechanicProfile() {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/auth/change-password`, {
        current_password: form.current_password,
        new_password: form.new_password
      }, { withCredentials: true });
      
      setSuccess("Senha alterated com sucesso!");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MechanicLayout title="Meu Perfil">
      <div className="p-4 space-y-6 animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Lock size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Segurança</h2>
                <p className="text-xs text-slate-500">Alterar sua senha de acesso</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 animate-shake">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-3">
                <CheckCircle size={16} className="flex-shrink-0" />
                {success}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Senha Atual</label>
              <div className="relative">
                <input
                  name="current_password"
                  type={showPass ? "text" : "password"}
                  value={form.current_password}
                  onChange={handleChange}
                  required
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Nova Senha</label>
              <input
                name="new_password"
                type="password"
                value={form.new_password}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Confirmar Nova Senha</label>
              <input
                name="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={handleChange}
                required
                className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm"
                placeholder="Repita a nova senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
            >
              {loading ? "Salvando..." : (
                <>
                  <Save size={18} />
                  Salvar Nova Senha
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-blue-900 mb-1" style={{ fontFamily: 'Outfit' }}>Dica de Segurança</h3>
          <p className="text-xs text-blue-700 leading-relaxed">
            Use uma senha forte que contenha letras maiúsculas, minúsculas e números. Não compartilhe sua senha com ninguém.
          </p>
        </div>
      </div>
    </MechanicLayout>
  );
}
