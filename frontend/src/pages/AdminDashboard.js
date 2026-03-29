import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../components/Layout";
import { TrendingUp, Users, ClipboardList, DollarSign, Plus, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function KPICard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 card-hover" data-testid={`kpi-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</span>
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
        <p className="text-xs font-bold text-slate-600 mb-1">{label}</p>
        <p className="text-sm font-bold text-blue-600">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: res } = await axios.get(`${API}/dashboard/admin`, { withCredentials: true });
      setData(res);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-28 animate-pulse-bg"></div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-kpis">
          <KPICard
            title="Faturamento do Mês"
            value={formatCurrency(data?.total_month)}
            icon={DollarSign}
            color="bg-blue-600"
            subtitle={`${data?.services_month_count || 0} serviços`}
          />
          <KPICard
            title="Total de Serviços"
            value={data?.total_services || 0}
            icon={ClipboardList}
            color="bg-slate-700"
            subtitle="Todos os tempos"
          />
          <KPICard
            title="Mecânicos Ativos"
            value={data?.mechanics_count || 0}
            icon={Users}
            color="bg-green-600"
            subtitle="No workspace"
          />
          <KPICard
            title="Serviços este Mês"
            value={data?.services_month_count || 0}
            icon={TrendingUp}
            color="bg-orange-500"
            subtitle="Mês atual"
          />
        </div>

        {/* Chart + Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>Faturamento mensal</h2>
            {data?.monthly_chart?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthly_chart} barSize={32}>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Sem dados de faturamento ainda
              </div>
            )}
          </div>

          {/* Mechanic Ranking */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>Ranking</h2>
              <Link to="/admin/mechanics" className="text-xs text-blue-600 font-semibold hover:text-blue-700">Ver todos</Link>
            </div>
            {data?.mechanic_ranking?.length === 0 ? (
              <div className="text-center py-8">
                <Users size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhum mecânico ainda</p>
                <Link to="/admin/mechanics" className="text-xs text-blue-600 font-semibold mt-2 block">Adicionar mecânico</Link>
              </div>
            ) : (
              <div className="space-y-3" data-testid="mechanic-ranking">
                {(data?.mechanic_ranking || []).slice(0, 5).map((m, i) => (
                  <div key={m.id || i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-slate-300 text-slate-700" : "bg-orange-100 text-orange-700"}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.services_count} serviços</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(m.total_month)}</p>
                      <p className="text-xs text-green-600">{formatCurrency(m.commission)} com.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Services */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>Serviços Recentes</h2>
            <Link to="/admin/services" className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-700">
              Ver todos <ArrowUpRight size={14} />
            </Link>
          </div>
          {!data?.recent_services?.length ? (
            <div className="p-8 text-center">
              <ClipboardList size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhum serviço registrado ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50" data-testid="recent-services-list">
              {(data?.recent_services || []).map((s, i) => (
                <div key={s.id || i} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.client_name}</p>
                    <p className="text-xs text-slate-500">
                      {s.mechanic_name} • {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(s.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/admin/mechanics" className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-fast card-hover" data-testid="add-mechanic-quick">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Plus size={18} className="text-blue-600" />
            </div>
            <span className="text-sm font-medium text-slate-900">Adicionar Mecânico</span>
          </Link>
          <Link to="/admin/reports" className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-fast card-hover" data-testid="export-report-quick">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-900">Exportar Relatório</span>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
