import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader, LayoutDashboard, RefreshCcw, Wrench } from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const isSuccess = location.pathname === "/billing/success";

  const [activationStatus, setActivationStatus] = useState("checking"); // checking | active | pending
  const [attempts, setAttempts] = useState(0);

  // Poll workspace status after successful payment
  useEffect(() => {
    if (!isSuccess) return;

    let tries = 0;
    const MAX_TRIES = 8;
    const INTERVAL_MS = 4000;

    const check = async () => {
      try {
        // Fallback para localhost: forçar simulação de webhook chamando verify-payment
        const verifyResp = await axios.post(`${API}/billing/verify-payment`, {}, { withCredentials: true });
        if (verifyResp.data?.status === "active") {
          await refreshUser();
          setActivationStatus("active");
          return true;
        }

        // Continua monitorando o me (se o webhook verdadeiro do Asaas eventualmente chegar em prod)
        const { data } = await axios.get(`${API}/auth/me`, { withCredentials: true });
        const status = data?.workspace?.status;
        if (status === "active") {
          await refreshUser();
          setActivationStatus("active");
          return true;
        }
      } catch {}
      return false;
    };

    // First immediate check
    check().then((done) => {
      if (done) return;
      setActivationStatus("pending");

      const interval = setInterval(async () => {
        tries++;
        setAttempts(tries);
        const done = await check();
        if (done || tries >= MAX_TRIES) {
          clearInterval(interval);
          if (!done) setActivationStatus("pending");
        }
      }, INTERVAL_MS);

      return () => clearInterval(interval);
    });
  }, [isSuccess]);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" style={{ fontFamily: "IBM Plex Sans, sans-serif" }}>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm animate-fade-in">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wrench size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit" }}>AutoGestão</span>
          </div>

          {/* Icon */}
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={44} className="text-green-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "Outfit" }}>
            Pagamento confirmado!
          </h1>
          <p className="text-slate-500 mb-6 text-sm leading-relaxed">
            Seu pagamento foi processado com sucesso pelo Asaas.
          </p>

          {/* Activation status */}
          <div className="mb-6">
            {activationStatus === "checking" && (
              <div className="flex items-center justify-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl px-4 py-3" data-testid="activation-checking">
                <Loader size={16} className="animate-spin" />
                <span className="text-sm font-medium">Verificando ativação da conta...</span>
              </div>
            )}
            {activationStatus === "active" && (
              <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3" data-testid="activation-active">
                <CheckCircle size={16} />
                <span className="text-sm font-bold">Conta ativada com sucesso!</span>
              </div>
            )}
            {activationStatus === "pending" && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3" data-testid="activation-pending">
                <div className="flex items-center gap-2 mb-1">
                  <Loader size={14} className="animate-spin" />
                  <span className="text-sm font-bold">Ativação em processamento</span>
                </div>
                <p className="text-xs text-yellow-700">
                  Isso pode levar alguns instantes. Acesse o dashboard — sua conta será ativada automaticamente.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-full flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-fast"
            data-testid="go-to-dashboard-btn"
          >
            <LayoutDashboard size={18} />
            Ir para o Dashboard
          </button>

          <p className="text-xs text-slate-400 mt-4">
            Dúvidas? Entre em contato com o suporte.
          </p>
        </div>
      </div>
    );
  }

  // Failure page
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4" style={{ fontFamily: "IBM Plex Sans, sans-serif" }}>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit" }}>AutoGestão</span>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle size={44} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "Outfit" }}>
          Pagamento não concluído
        </h1>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
          O pagamento não foi processado. Isso pode ter ocorrido por saldo insuficiente, dados incorretos ou cancelamento.
        </p>

        <div className="space-y-3" data-testid="failure-actions">
          <Link
            to="/admin/billing"
            className="w-full flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-fast"
            data-testid="retry-payment-btn"
          >
            <RefreshCcw size={18} />
            Tentar novamente
          </Link>
          <Link
            to="/admin/dashboard"
            className="w-full flex items-center justify-center gap-2 h-12 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-fast"
            data-testid="back-to-dashboard-btn"
          >
            Voltar ao Dashboard
          </Link>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Se o problema persistir, contate o suporte.
        </p>
      </div>
    </div>
  );
}
