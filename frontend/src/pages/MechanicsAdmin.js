import { useState, useEffect } from "react";
import { AdminLayout } from "../components/Layout";
import { UserPlus, Edit2, Power, AlertCircle, CheckCircle, X, Percent, Lock, Copy } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function MechanicModal({ mechanic, onSave, onClose }) {
  const isEdit = !!mechanic?.id;
  const [form, setForm] = useState({
    name: mechanic?.name || "",
    email: mechanic?.email || "",
    password: "",
    commission_percentage: mechanic?.commission_percentage != null ? String(mechanic.commission_percentage) : ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || (!isEdit && !form.email) || (!isEdit && !form.password)) {
      setError("Preencha os campos obrigatórios");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        commission_percentage: form.commission_percentage ? parseFloat(form.commission_percentage) : null
      };
      if (isEdit) {
        await axios.put(`${API}/mechanics/${mechanic.id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API}/mechanics`, {
          ...payload, email: form.email, password: form.password
        }, { withCredentials: true });
      }
      onSave();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Erro ao salvar mecânico");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            {isEdit ? "Editar Mecânico" : "Adicionar Mecânico"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4" data-testid="mechanic-form">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" data-testid="mechanic-error">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Nome *</label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Nome completo" className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm" data-testid="mechanic-name-input" />
          </div>
          {!isEdit && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Email *</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="email@exemplo.com" className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm" data-testid="mechanic-email-input" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">Senha *</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Mínimo 6 caracteres" className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm" data-testid="mechanic-password-input" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Comissão Individual (%)
              <span className="text-slate-300 normal-case font-normal tracking-normal ml-1">– deixe vazio para usar o padrão</span>
            </label>
            <div className="relative">
              <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="commission_percentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.commission_percentage}
                onChange={handleChange}
                placeholder="Ex: 15"
                className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm"
                data-testid="mechanic-commission-input"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-fast">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-fast"
              data-testid="save-mechanic-btn"
            >
              {loading ? "Salvando..." : isEdit ? "Salvar" : "Adicionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ mechanic, onReset, onClose }) {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      const { data } = await axios.put(`${API}/mechanics/${mechanic.id}/reset-password`, {}, { withCredentials: true });
      setNewPassword(data.new_password);
    } catch (err) {
      alert("Erro ao resetar senha");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 text-left">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl animate-fade-in overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Resetar Senha</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-400" /></button>
        </div>
        
        <div className="p-6">
          {!newPassword ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                <Lock size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Tem certeza que deseja resetar a senha de <strong>{mechanic.name}</strong>?</p>
                <p className="text-xs text-slate-400 mt-1">Uma nova senha aleatória será gerada.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium">Cancelar</button>
                <button 
                  onClick={handleReset} 
                  disabled={loading}
                  className="flex-1 h-10 bg-orange-600 text-white rounded-xl text-sm font-bold hover:bg-orange-700 disabled:opacity-50"
                  data-testid="confirm-reset-btn"
                >
                  {loading ? "Gerando..." : "Confirmar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-3">Nova senha gerada com sucesso:</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                  <code className="text-2xl font-bold text-slate-900 tracking-wider font-mono">{newPassword}</code>
                  <button 
                    onClick={handleCopy}
                    className={`p-2.5 rounded-xl transition-all ${copied ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm"}`}
                    data-testid="copy-password-btn"
                  >
                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                  </button>
                </div>
                {copied && <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider mt-2">Copiado!</p>}
              </div>
              <button 
                onClick={onClose}
                className="w-full h-11 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800"
              >
                Concluído
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MechanicsAdmin() {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [mechRes, subRes] = await Promise.all([
        axios.get(`${API}/mechanics`, { withCredentials: true }),
        axios.get(`${API}/billing/subscription`, { withCredentials: true })
      ]);
      setMechanics(mechRes.data.mechanics || []);
      setSubscription(subRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggleActive = async (m) => {
    setTogglingId(m.id);
    try {
      await axios.put(`${API}/mechanics/${m.id}`, { is_active: !m.is_active }, { withCredentials: true });
      load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      alert(typeof detail === "string" ? detail : "Erro ao atualizar mecânico");
    } finally {
      setTogglingId(null);
    }
  };

  const activeMechanics = mechanics.filter(m => m.is_active !== false);
  const maxMechanics = subscription?.plan_max_mechanics;
  const isLimitReached = maxMechanics && maxMechanics > 0 && activeMechanics.length >= maxMechanics;

  return (
    <AdminLayout title="Mecânicos">
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {activeMechanics.length} ativo(s)
              {maxMechanics && maxMechanics > 0 ? ` de ${maxMechanics} no plano` : ""}
            </p>
          </div>
          <button
            onClick={() => setModal({})}
            disabled={isLimitReached}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-fast"
            data-testid="add-mechanic-btn"
          >
            <UserPlus size={17} />
            Adicionar Mecânico
          </button>
        </div>

        {/* Plan limit warning */}
        {maxMechanics && maxMechanics > 0 && activeMechanics.length >= maxMechanics && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-sm rounded-xl p-3" data-testid="plan-limit-warning">
            <AlertCircle size={16} className="flex-shrink-0" />
            Limite do plano atingido ({maxMechanics} mecânicos). <a href="/admin/billing" className="font-semibold underline ml-1">Fazer upgrade</a>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl animate-pulse-bg"></div>)}
          </div>
        ) : mechanics.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <UserPlus size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">Nenhum mecânico cadastrado</p>
            <button
               onClick={() => setModal({})}
               disabled={isLimitReached}
               className="bg-blue-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
               data-testid="first-mechanic-btn"
            >
              Adicionar primeiro mecânico
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="mechanics-grid">
            {mechanics.map(m => (
              <div key={m.id} className={`bg-white border rounded-xl p-5 card-hover ${m.is_active !== false ? "border-slate-200" : "border-slate-100 opacity-60"}`} data-testid={`mechanic-card-${m.id}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-blue-700 text-base">{(m.name || "M")[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setResetModal(m)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-fast"
                      title="Resetar Senha"
                      data-testid={`reset-password-${m.id}`}
                    >
                      <Lock size={15} />
                    </button>
                    <button
                      onClick={() => setModal(m)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-fast"
                      data-testid={`edit-mechanic-${m.id}`}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(m)}
                      disabled={togglingId === m.id || (m.is_active === false && isLimitReached)}
                      className={`p-1.5 rounded-lg transition-fast ${m.is_active !== false ? "hover:bg-red-50 text-slate-400 hover:text-red-500" : "hover:bg-green-50 text-slate-400 hover:text-green-600"} disabled:opacity-30 disabled:cursor-not-allowed`}
                      title={m.is_active === false && isLimitReached ? "Limite do plano atingido" : ""}
                      data-testid={`toggle-mechanic-${m.id}`}
                    >
                      <Power size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-400">Este mês</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(m.total_month)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-400">Comissão</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(m.commission)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-400">%</p>
                    <p className="text-sm font-bold text-slate-900">{m.commission_percentage}%</p>
                  </div>
                </div>
                {m.is_active === false && (
                  <div className="mt-3 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">Desativado</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal !== null && (
        <MechanicModal
          mechanic={modal?.id ? modal : null}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}

      {resetModal !== null && (
        <ResetPasswordModal
          mechanic={resetModal}
          onClose={() => setResetModal(null)}
        />
      )}
    </AdminLayout>
  );
}
