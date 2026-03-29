import { useState, useEffect } from "react";
import { AdminLayout } from "../components/Layout";
import { CreditCard, CheckCircle, ExternalLink, AlertCircle, ArrowRight } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

const PLANS = [
  { id: "basic", name: "Básico", price: 69.90, max_mechanics: 2, description: "Até 2 mecânicos" },
  { id: "pro", name: "Pro", price: 149.90, max_mechanics: 5, description: "Até 5 mecânicos" },
  { id: "premium", name: "Premium", price: 249.90, max_mechanics: -1, description: "Mecânicos ilimitados" },
];

export default function Billing() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutForm, setCheckoutForm] = useState({ billing_type: "PIX", cpf_cnpj: "" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState("");

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/billing/subscription`, { withCredentials: true });
      setSubscription(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const { data } = await axios.post(`${API}/billing/checkout`, checkoutForm, { withCredentials: true });
      if (data.checkout_url) {
        setCheckoutUrl(data.checkout_url);
      } else {
        setCheckoutError("Não foi possível gerar o link de pagamento. Verifique as configurações.");
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setCheckoutError(typeof detail === "string" ? detail : "Erro ao processar pagamento");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    setUpgradeLoading(planId);
    setUpgradeSuccess("");
    try {
      await axios.put(`${API}/billing/plan`, { plan: planId }, { withCredentials: true });
      setUpgradeSuccess(`Plano alterado para ${PLANS.find(p => p.id === planId)?.name}!`);
      load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert(typeof detail === "string" ? detail : "Erro ao alterar plano");
    } finally {
      setUpgradeLoading(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Assinatura">
        <div className="space-y-4 max-w-2xl">
          {[1,2].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse-bg"></div>)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Assinatura">
      <div className="max-w-2xl space-y-6 animate-fade-in">
        {/* Current plan */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>Plano Atual</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{subscription?.plan_name}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${subscription?.status === "active" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {subscription?.status === "active" ? "Ativo" : "Pendente"}
                </span>
              </div>
              <p className="text-slate-500 text-sm">{formatCurrency(subscription?.plan_price)}/mês</p>
              <p className="text-slate-500 text-sm mt-1">
                {subscription?.current_mechanics} / {subscription?.plan_max_mechanics === -1 ? "∞" : subscription?.plan_max_mechanics} mecânicos
              </p>
            </div>
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
              <CreditCard size={28} className="text-blue-600" />
            </div>
          </div>
        </div>

        {upgradeSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-3" data-testid="upgrade-success">
            <CheckCircle size={16} />
            {upgradeSuccess}
          </div>
        )}

        {/* Plan options */}
        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3" style={{ fontFamily: 'Outfit' }}>Mudar de Plano</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map(plan => {
              const isCurrent = plan.id === subscription?.plan;
              return (
                <div
                  key={plan.id}
                  className={`border-2 rounded-xl p-4 ${isCurrent ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}
                  data-testid={`billing-plan-${plan.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Outfit' }}>{plan.name}</span>
                    {isCurrent && <CheckCircle size={16} className="text-blue-600" />}
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mb-1" style={{ fontFamily: 'Outfit' }}>R$ {plan.price.toFixed(2).replace(".", ",")}</p>
                  <p className="text-xs text-slate-500 mb-3">{plan.description}</p>
                  {!isCurrent && (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgradeLoading === plan.id}
                      className="w-full h-9 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-fast flex items-center justify-center gap-1"
                      data-testid={`upgrade-to-${plan.id}`}
                    >
                      {upgradeLoading === plan.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>Selecionar <ArrowRight size={12} /></>
                      )}
                    </button>
                  )}
                  {isCurrent && <p className="text-xs text-blue-600 font-semibold text-center">Plano atual</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment / Checkout */}
        {!subscription?.asaas_subscription_id && (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>Configurar Pagamento</h2>
            <p className="text-sm text-slate-500 mb-4">Configure o pagamento recorrente via Asaas (PIX, Boleto ou Cartão).</p>

            {checkoutUrl ? (
              <div className="text-center py-6">
                <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-900 mb-4">Link de pagamento gerado!</p>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-fast"
                  data-testid="payment-link"
                >
                  Ir para Pagamento <ExternalLink size={16} />
                </a>
              </div>
            ) : (
              <form onSubmit={handleCheckout} className="space-y-4" data-testid="checkout-form">
                {checkoutError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" data-testid="checkout-error">
                    <AlertCircle size={16} />
                    {checkoutError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Forma de Pagamento</label>
                  <select
                    value={checkoutForm.billing_type}
                    onChange={e => setCheckoutForm(f => ({ ...f, billing_type: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-500 outline-none"
                    data-testid="billing-type-select"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">CPF/CNPJ *</label>
                  <input
                    type="text"
                    value={checkoutForm.cpf_cnpj}
                    onChange={e => setCheckoutForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
                    required
                    placeholder="000.000.000-00"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    data-testid="checkout-cpf-cnpj"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-fast flex items-center justify-center gap-2"
                  data-testid="generate-checkout-btn"
                >
                  {checkoutLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : <CreditCard size={18} />}
                  Gerar Link de Pagamento
                </button>
              </form>
            )}
          </div>
        )}

        {/* Asaas ID info */}
        {subscription?.asaas_subscription_id && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Assinatura Asaas</p>
            <p className="text-xs text-slate-600 font-mono break-all">{subscription.asaas_subscription_id}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
