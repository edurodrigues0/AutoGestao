import { useState, useEffect } from "react";
import { AdminLayout } from "../components/Layout";
import { CreditCard, CheckCircle, ExternalLink, AlertCircle, ArrowRight, Loader } from "lucide-react";
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
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
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
    if (!cpfCnpj.trim()) {
      setError("CPF/CNPJ é obrigatório para gerar o pagamento.");
      return;
    }
    setError("");
    setCheckoutLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/billing/checkout`,
        { cpf_cnpj: cpfCnpj.trim(), phone: phone.trim() || null },
        { withCredentials: true }
      );
      // Redirect to Asaas native checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Erro ao gerar o link de pagamento. Tente novamente.");
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
        <div className="space-y-4 max-w-xl">
          {[1, 2].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse-bg" />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Assinatura">
      <div className="max-w-xl space-y-5 animate-fade-in">

        {/* Current plan card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Plano Atual</p>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-bold text-slate-900" style={{ fontFamily: "Outfit" }}>
                  {subscription?.plan_name}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  subscription?.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`} data-testid="subscription-status">
                  {subscription?.status === "active" ? "Ativo" : "Pendente pagamento"}
                </span>
              </div>
              <p className="text-sm text-slate-500">{formatCurrency(subscription?.plan_price)}/mês</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {subscription?.current_mechanics} / {subscription?.plan_max_mechanics === -1 ? "∞" : subscription?.plan_max_mechanics} mecânicos
              </p>
            </div>
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
              <CreditCard size={26} className="text-blue-600" />
            </div>
          </div>
        </div>

        {upgradeSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-3" data-testid="upgrade-success">
            <CheckCircle size={16} />
            {upgradeSuccess}
          </div>
        )}

        {/* Change plan */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Mudar de Plano</p>
          <div className="grid grid-cols-3 gap-3">
            {PLANS.map(plan => {
              const isCurrent = plan.id === subscription?.plan;
              return (
                <div
                  key={plan.id}
                  className={`border-2 rounded-xl p-3 text-center ${isCurrent ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
                  data-testid={`billing-plan-${plan.id}`}
                >
                  <p className="text-xs font-bold text-slate-900 mb-1" style={{ fontFamily: "Outfit" }}>{plan.name}</p>
                  <p className="text-sm font-bold text-blue-600 mb-0.5">R$ {plan.price.toFixed(2).replace(".", ",")}</p>
                  <p className="text-xs text-slate-400 mb-2">{plan.description}</p>
                  {isCurrent ? (
                    <span className="text-xs text-blue-600 font-semibold">Atual</span>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={!!upgradeLoading}
                      className="w-full h-7 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-fast"
                      data-testid={`upgrade-to-${plan.id}`}
                    >
                      {upgradeLoading === plan.id ? (
                        <Loader size={12} className="animate-spin mx-auto" />
                      ) : "Selecionar"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Checkout / payment form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Pagamento via Asaas</p>
          <p className="text-sm text-slate-500 mb-4">
            Você será redirecionado para o checkout seguro do Asaas onde poderá pagar via PIX, Boleto ou Cartão.
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4" data-testid="checkout-error">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-3" data-testid="checkout-form">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                CPF / CNPJ *
              </label>
              <input
                type="text"
                value={cpfCnpj}
                onChange={e => setCpfCnpj(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
                required
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm"
                data-testid="checkout-cpf-cnpj"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Telefone <span className="text-slate-300 normal-case font-normal tracking-normal">(opcional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm"
                data-testid="checkout-phone"
              />
            </div>

            <button
              type="submit"
              disabled={checkoutLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-fast flex items-center justify-center gap-2 mt-1"
              data-testid="go-to-checkout-btn"
            >
              {checkoutLoading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Gerando checkout...
                </>
              ) : (
                <>
                  <ExternalLink size={18} />
                  Ir para o Checkout Asaas
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle size={13} className="text-green-500" />
            Checkout 100% seguro via Asaas · PIX, Boleto ou Cartão
          </div>
        </div>

        {/* Subscription info */}
        {subscription?.asaas_subscription_id && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">ID Assinatura Asaas</p>
            <p className="text-xs text-slate-600 font-mono break-all">{subscription.asaas_subscription_id}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
