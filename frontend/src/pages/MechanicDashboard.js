import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MechanicLayout } from "../components/Layout";
import { DollarSign, TrendingUp, ClipboardList, Camera, ChevronRight, CreditCard, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export default function MechanicDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  useEffect(function loadDashboardOnMount() {
    async function fetchDashboard() {
      try {
        const { data: res } = await axios.get(`${API}/dashboard/mechanic`, { withCredentials: true });
        setData(res);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <MechanicLayout title="">
        <div className="p-4 space-y-4">
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse-bg"></div>
          <div className="h-20 bg-slate-200 rounded-2xl animate-pulse-bg"></div>
        </div>
      </MechanicLayout>
    );
  }

  return (
    <MechanicLayout title="">
      <div className="p-4 space-y-4 animate-fade-in">
        {user?.workspace?.status !== "active" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Outfit' }}>Oficina com Pagamento Pendente</p>
              <p className="text-slate-500 text-xs mt-0.5">
                O acesso às funcionalidades de registro e listagem de serviços está temporariamente bloqueado.
                Contate o administrador da oficina.
              </p>
            </div>
          </div>
        )}
        {/* Main earning card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white" data-testid="earnings-card">
          <p className="text-sm text-blue-200 mb-1 capitalize">{monthName}</p>
          <p className="text-4xl font-bold mb-1" style={{ fontFamily: 'Outfit' }}>{formatCurrency(data?.total_month)}</p>
          <p className="text-blue-200 text-sm">{data?.services_count_month || 0} serviços no mês</p>
          <div className="mt-4 pt-4 border-t border-blue-500 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-200">Sua comissão</p>
              <p className="text-xl font-bold" style={{ fontFamily: 'Outfit' }}>{formatCurrency(data?.commission_month)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200">Percentual</p>
              <p className="text-xl font-bold" style={{ fontFamily: 'Outfit' }}>{data?.commission_percentage || 0}%</p>
            </div>
          </div>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="total-all-time">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Geral</span>
            </div>
            <p className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{formatCurrency(data?.total_all)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="total-services-count">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={16} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Serviços</span>
            </div>
            <p className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{data?.services_count || 0}</p>
          </div>
        </div>

        {/* CTA - Register service */}
        <Link
          to="/mechanic/add-service"
          className="flex items-center justify-between bg-slate-900 text-white rounded-2xl p-5 hover:bg-slate-800 transition-fast active:scale-95"
          data-testid="add-service-cta"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Camera size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-base" style={{ fontFamily: 'Outfit' }}>Registrar Serviço</p>
              <p className="text-slate-400 text-sm">Foto + cliente + valor</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-400" />
        </Link>

        {/* Recent Services */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>Meus Serviços Recentes</h2>
            <Link to="/mechanic/services" className="text-xs text-blue-600 font-semibold">Ver todos</Link>
          </div>
          {!data?.recent_services?.length ? (
            <div className="p-8 text-center">
              <ClipboardList size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 mb-3">Nenhum serviço ainda</p>
              <Link
                to="/mechanic/add-service"
                className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700"
                data-testid="first-service-btn"
              >
                Registrar primeiro serviço
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50" data-testid="mechanic-services-list">
              {data.recent_services.map((s, i) => (
                <div key={s.id || i} className="px-4 py-3 flex items-center gap-3">
                  {s.photo_path ? (
                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      <ServiceThumb path={s.photo_path} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Camera size={16} className="text-blue-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.client_name}</p>
                    <p className="text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(s.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MechanicLayout>
  );
}

function ServiceThumb({ path }) {
  const [src, setSrc] = useState(null);
  useEffect(function loadServiceThumbPhotoOnMount() {
    let url;
    axios.get(`${API}/services/photo/${path}`, { responseType: "blob", withCredentials: true })
      .then(r => { url = URL.createObjectURL(r.data); setSrc(url); })
      .catch(() => { });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [path]);
  if (!src) return <div className="w-full h-full bg-slate-200 animate-pulse-bg"></div>;
  return <img src={src} alt="Serviço" className="w-full h-full object-cover" />;
}
