import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Wrench, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const plans = [
  { id: "basic", name: "Básico", price: "69,90", mechanics: "2 mecânicos" },
  { id: "pro", name: "Pro", price: "149,90", mechanics: "5 mecânicos" },
  { id: "premium", name: "Premium", price: "249,90", mechanics: "Mecânicos ilimitados" },
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

  const validateStep1 = () => {
    if (!form.name || !form.owner_name || !form.email || !form.password) {
      setError("Preencha todos os campos obrigatórios");
      return false;
    }
    if (form.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/register-workspace`, {
        ...form, plan: selectedPlan
      }, { withCredentials: true });
      
      setUser(data.user);
      
      if (data.checkout_url) {
        // Redireciona imediatamente para o checkout do Asaas
        window.location.href = data.checkout_url;
      } else {
        navigate("/admin/dashboard");
      }
    } catch (err) {
      setError(formatError(err.response?.data?.detail));
      setStep(1); // Go back to fix errors
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm animate-fade-in">
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
              className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-fast mb-3 w-full shadow-lg shadow-blue-200"
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
    <div className="min-h-screen bg-slate-50 py-12 px-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <Wrench size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>AutoGestão</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            {step === 1 ? "Crie sua conta" : "Escolha seu plano"}
          </h1>
          <p className="text-slate-500 mt-2">
            {step === 1 ? "Comece seu teste grátis agora mesmo" : "O plano ideal para o tamanho da sua oficina"}
          </p>
        </div>

        {/* Step 1: Registration Form */}
        {step === 1 && (
          <div className="animate-fade-in bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-8" style={{ fontFamily: 'Outfit' }}>
              Dados da oficina
            </h2>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-8" data-testid="register-error">
                <AlertCircle size={18} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-5" data-testid="register-form">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Nome da Oficina *</label>
                  <input name="name" value={form.name} onChange={handleChange} required placeholder="Ex: Auto Center Silva" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-slate-900 transition-all" data-testid="register-name" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Seu Nome *</label>
                  <input name="owner_name" value={form.owner_name} onChange={handleChange} required placeholder="Nome do responsável" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-slate-900 transition-all" data-testid="register-owner-name" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Email *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="email@oficina.com" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-slate-900 transition-all" data-testid="register-email" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Senha *</label>
                  <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Mínimo 6 caracteres" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-slate-900 transition-all" data-testid="register-password" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Telefone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-slate-900 transition-all" data-testid="register-phone" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">CPF/CNPJ</label>
                  <input name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} placeholder="000.000.000-00" className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none text-slate-900 transition-all" data-testid="register-cpf-cnpj" />
                </div>
              </div>

              <button
                onClick={() => validateStep1() && setStep(2)}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all mt-4 flex items-center justify-center gap-3 shadow-lg shadow-blue-200 group"
                data-testid="register-next-btn"
              >
                Próximo passo: Escolher plano
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <p className="text-center text-sm text-slate-500 mt-6">
                Já tem conta?{" "}
                <Link to="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Plan Selection */}
        {step === 2 && (
          <div className="animate-fade-in">
            <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700 mb-8 flex items-center gap-1 font-medium transition-all">
              ← Voltar para dados
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative border-2 rounded-2xl p-6 text-left transition-all duration-300 transform ${
                    selectedPlan === plan.id
                      ? "border-blue-600 bg-blue-50/50 ring-4 ring-blue-50 scale-[1.02] shadow-md"
                      : "border-white bg-white hover:border-slate-200 shadow-sm"
                  }`}
                  data-testid={`select-plan-${plan.id}`}
                >
                  {selectedPlan === plan.id && (
                    <div className="absolute -top-3 -right-3 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                      <CheckCircle size={20} />
                    </div>
                  )}
                  <div className="mb-4">
                    <span className="font-bold text-slate-900 text-lg" style={{ fontFamily: 'Outfit' }}>{plan.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-sm font-medium text-slate-500">R$</span>
                    <span className="text-3xl font-bold text-blue-600" style={{ fontFamily: 'Outfit' }}>{plan.price}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{plan.mechanics}</p>
                </button>
              ))}
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-14 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3"
              data-testid="plan-finish-btn"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Criando conta...
                </div>
              ) : (
                <>
                  Concluir Registro
                  <CheckCircle size={20} />
                </>
              )}
            </button>
            
            <p className="text-center text-sm text-slate-400 mt-6 px-10">
              Ao concluir, você concorda com nossos Termos de Uso e Política de Privacidade.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
