import { useState, useEffect } from "react";
import { AdminLayout } from "../components/Layout";
import { Save, AlertCircle, CheckCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", commission_type: "fixed", commission_percentage: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/settings`, { withCredentials: true })
      .then(({ data }) => {
        setSettings(data);
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          commission_type: data.commission_type || "fixed",
          commission_percentage: data.commission_percentage != null ? String(data.commission_percentage) : "10"
        });
      })
      .catch(() => setError("Erro ao carregar configurações"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, {
        name: form.name,
        phone: form.phone || null,
        commission_type: form.commission_type,
        commission_percentage: form.commission_percentage ? parseFloat(form.commission_percentage) : null
      }, { withCredentials: true });
      setSuccess("Configurações salvas com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Configurações">
        <div className="max-w-lg space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse-bg"></div>)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configurações">
      <div className="max-w-lg animate-fade-in">
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5" data-testid="settings-form">
          <h2 className="text-base font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>Dados da Oficina</h2>

          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-3" data-testid="settings-success">
              <CheckCircle size={16} />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" data-testid="settings-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Nome da Oficina</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm" data-testid="settings-name" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Telefone</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm" data-testid="settings-phone" />
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>Configurações de Comissão</h3>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Tipo de Comissão</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, commission_type: "fixed" }))}
                  className={`h-12 rounded-xl border-2 text-sm font-semibold transition-fast ${form.commission_type === "fixed" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                  data-testid="commission-fixed-btn"
                >
                  Fixo para Todos
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, commission_type: "individual" }))}
                  className={`h-12 rounded-xl border-2 text-sm font-semibold transition-fast ${form.commission_type === "individual" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                  data-testid="commission-individual-btn"
                >
                  Individual
                </button>
              </div>
            </div>

            {form.commission_type === "fixed" && (
              <div className="mt-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Percentual Padrão (%)
                </label>
                <input
                  type="number"
                  name="commission_percentage"
                  value={form.commission_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="10"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm"
                  data-testid="settings-commission-pct"
                />
                <p className="text-xs text-slate-400 mt-1">Aplicado a todos os mecânicos que não têm percentual individual</p>
              </div>
            )}
            {form.commission_type === "individual" && (
              <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-xl p-3">
                Configure o percentual de cada mecânico individualmente na tela de Mecânicos.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-fast flex items-center justify-center gap-2"
            data-testid="save-settings-btn"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : <Save size={18} />}
            Salvar Configurações
          </button>
        </form>

        {settings && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Informações da Conta</p>
            <p className="text-sm text-slate-600">Email: <span className="font-medium text-slate-900">{settings.email}</span></p>
            <p className="text-sm text-slate-600 mt-1">Plano: <span className="font-medium text-slate-900 capitalize">{settings.plan}</span></p>
            <p className="text-sm text-slate-600 mt-1">Status: <span className={`font-medium ${settings.status === "active" ? "text-green-600" : "text-orange-600"}`}>{settings.status === "active" ? "Ativo" : "Pendente"}</span></p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
