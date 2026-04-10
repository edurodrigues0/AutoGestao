import { useState, useEffect } from "react";
import { AdminLayout } from "../components/Layout";
import { FileText, Download, Calendar, User, AlertCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Reports() {
  const [mechanics, setMechanics] = useState([]);
  const [filters, setFilters] = useState({ mechanic_id: "", start_date: "", end_date: "" });
  const [loading, setLoading] = useState({ pdf: false, excel: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleExport = async (format) => {
    setError("");
    setSuccess("");
    setLoading(l => ({ ...l, [format]: true }));
    try {
      const params = new URLSearchParams({ format });
      if (filters.mechanic_id) params.append("mechanic_id", filters.mechanic_id);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);

      const response = await axios.get(`${API}/reports/export?${params}`, {
        withCredentials: true,
        responseType: "blob"
      });

      const ext = format === "pdf" ? "pdf" : "xlsx";
      const mime = format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const blob = new Blob([response.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`Relatório ${format.toUpperCase()} exportado com sucesso!`);
    } catch (err) {
      setError("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setLoading(l => ({ ...l, [format]: false }));
    }
  };

  const handleChange = (e) => setFilters(f => ({ ...f, [e.target.name]: e.target.value }));

  useEffect(function loadMechanicsOnMount() {
    axios.get(`${API}/mechanics`, { withCredentials: true })
      .then(({ data }) => setMechanics(data.mechanics || []))
      .catch(() => { });
  }, []);

  return (
    <AdminLayout title="Relatórios">
      <div className="max-w-2xl animate-fade-in">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-1" style={{ fontFamily: 'Outfit' }}>Exportar Relatório de Serviços</h2>
            <p className="text-sm text-slate-500">Configure os filtros abaixo e escolha o formato de exportação.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" data-testid="report-error">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl p-3" data-testid="report-success">
              <FileText size={16} className="flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Filters */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                <User size={12} className="inline mr-1" />
                Mecânico
              </label>
              <select
                name="mechanic_id"
                value={filters.mechanic_id}
                onChange={handleChange}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                data-testid="report-mechanic-filter"
              >
                <option value="">Todos os mecânicos</option>
                {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <Calendar size={12} className="inline mr-1" />
                  Data Inicial
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  data-testid="report-start-date"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <Calendar size={12} className="inline mr-1" />
                  Data Final
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleChange}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  data-testid="report-end-date"
                />
              </div>
            </div>
          </div>

          {/* Export buttons */}
          <div className="pt-2 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Formato de exportação</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExport("excel")}
                disabled={loading.excel}
                className="flex items-center justify-center gap-2 h-12 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl transition-fast"
                data-testid="export-excel-btn"
              >
                {loading.excel ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : <Download size={18} />}
                Excel (.xlsx)
              </button>
              <button
                onClick={() => handleExport("pdf")}
                disabled={loading.pdf}
                className="flex items-center justify-center gap-2 h-12 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-fast"
                data-testid="export-pdf-btn"
              >
                {loading.pdf ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : <FileText size={18} />}
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-800 font-medium mb-1">O relatório inclui:</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Data, mecânico, cliente e descrição de cada serviço</li>
            <li>• Valor de cada serviço</li>
            <li>• Comissão calculada por serviço</li>
            <li>• Total geral e comissão total</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
