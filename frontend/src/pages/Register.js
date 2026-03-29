import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Wrench, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const plans = [
  { id: "basic", name: "Básico", price: "69,90", mechanics: "2 mecânicos" },
  { id: "pro", name: "Pro", price: "149,90", mechanics: "5 mecânicos" },
  { id: "premium", name: "Premium", price: "249,90", mechanics: "Ilimitado" },
];

export default function Register() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get("plan") || "basic");
  const [form, setForm] = useState({ name: "", owner_name: "", email: "", password: "", phone: "", cpf_cnpj: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const formatError = (detail) => {
    if (!detail) return "Erro ao cadastrar";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map(e => e.msg || String(e)).join("; ");
    return String(detail);
  };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.owner_name || !form.email || !form.password) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }
    if (form.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/register-workspace`, {
        ...form, plan: selectedPlan
      }, { withCredentials: true });
      setUser(data.user);
      if (data.checkout_url) {
        setCheckoutUrl(data.checkout_url);
        setStep(3);
      } else {
        navigate("/admin/dashboard");
      }
    } catch (err) {
      setError(formatError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>Conta criada!</h1>
          <p className="text-slate-500 mb-6">Complete o pagamento para ativar sua conta ou continue em modo de teste.</p>
          {checkoutUrl && (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-fast mb-3 w-full"
              data-testid="checkout-link"
            >
              Ir para Pagamento
              <ArrowRight size={18} />
            </a>
          )}
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-full py-3 px-6 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-fast"
            data-testid="skip-payment-btn"
          >
            Acessar agora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Wrench size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>AutoGestão</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Cadastre sua oficina</h1>
          <p className="text-slate-500 text-sm mt-1">Configure em menos de 2 minutos</p>
        </div>

        {/* Step 1: Plan Selection */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 text-center" style={{ fontFamily: 'Outfit' }}>Escolha seu plano</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`border-2 rounded-xl p-5 text-left transition-fast ${
                    selectedPlan === plan.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  data-testid={`select-plan-${plan.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{plan.name}</span>
                    {selectedPlan === plan.id && <CheckCircle size={18} className="text-blue-600" />}
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mb-1" style={{ fontFamily: 'Outfit' }}>R$ {plan.price}</p>
                  <p className="text-xs text-slate-500">/mês • {plan.mechanics}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-fast"
              data-testid="plan-next-btn"
            >
              Continuar com {plans.find(p => p.id === selectedPlan)?.name}
            </button>
            <p className="text-center text-sm text-slate-500 mt-4">
              Já tem conta?{" "}
              <Link to="/login" className="text-blue-600 font-semibold">Entrar</Link>
            </p>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <div className="animate-fade-in bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
            <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700 mb-6 flex items-center gap-1">
              ← Voltar
            </button>
            <h2 className="text-lg font-semibold text-slate-900 mb-6" style={{ fontFamily: 'Outfit' }}>
              Dados da oficina — Plano {plans.find(p => p.id === selectedPlan)?.name}
            </h2>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-6" data-testid="register-error">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nome da Oficina *</label>
                  <input name="name" value={form.name} onChange={handleChange} required placeholder="Ex: Auto Center Silva" className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" data-testid="register-name" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Seu Nome *</label>
                  <input name="owner_name" value={form.owner_name} onChange={handleChange} required placeholder="Nome do responsável" className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" data-testid="register-owner-name" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="email@oficina.com" className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" data-testid="register-email" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Senha *</label>
                  <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Mínimo 6 caracteres" className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" data-testid="register-password" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Telefone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" data-testid="register-phone" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">CPF/CNPJ</label>
                  <input name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} placeholder="000.000.000-00" className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900" data-testid="register-cpf-cnpj" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-fast mt-2"
                data-testid="register-submit"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Cadastrando...
                  </div>
                ) : "Criar Conta"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
