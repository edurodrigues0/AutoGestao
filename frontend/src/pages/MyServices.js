import { useState, useEffect, useCallback } from "react";
import { MechanicLayout } from "../components/Layout";
import { Camera, Image, X } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function PhotoModal({ path, onClose }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    axios.get(`${API}/services/photo/${path}`, { responseType: "blob", withCredentials: true })
      .then(r => { url = URL.createObjectURL(r.data); setSrc(url); })
      .catch(() => onClose());
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [path, onClose]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow z-10">
          <X size={16} />
        </button>
        {src ? (
          <img src={src} alt="Serviço" className="w-full rounded-2xl max-h-[80vh] object-contain" />
        ) : (
          <div className="bg-slate-800 rounded-2xl h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyServices() {
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [photoModal, setPhotoModal] = useState(null);
  const [filters, setFilters] = useState({ start_date: "", end_date: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const { data } = await axios.get(`${API}/services`, { params, withCredentials: true });
      setServices(data.services || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const totalValue = services.reduce((acc, s) => acc + (s.value || 0), 0);

  return (
    <MechanicLayout title="Meus Serviços">
      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Filtrar por período</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">De</label>
              <input type="date" value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 outline-none" data-testid="my-services-start-date" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Até</label>
              <input type="date" value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 outline-none" data-testid="my-services-end-date" />
            </div>
          </div>
          {(filters.start_date || filters.end_date) && (
            <button onClick={() => setFilters({ start_date: "", end_date: "" })} className="mt-2 text-xs text-blue-600 font-semibold" data-testid="clear-my-services-filter">
              Limpar filtro
            </button>
          )}
        </div>

        {/* Summary */}
        {services.length > 0 && (
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
            <span className="text-sm text-slate-500">{total} serviços</span>
            <span className="text-sm font-bold text-slate-900">{formatCurrency(totalValue)}</span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse-bg"></div>)}
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <Camera size={36} className="text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nenhum serviço encontrado</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-50" data-testid="my-services-list">
            {services.map(s => (
              <div key={s.id} className="px-4 py-4 flex items-start gap-3">
                {/* Photo thumb */}
                {s.photo_path ? (
                  <button
                    onClick={() => setPhotoModal(s.photo_path)}
                    className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 hover:opacity-90 transition-fast"
                    data-testid={`service-photo-thumb-${s.id}`}
                  >
                    <ServiceThumb path={s.photo_path} />
                  </button>
                ) : (
                  <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Camera size={20} className="text-blue-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{s.client_name}</p>
                  {s.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{s.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">{new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-slate-900">{formatCurrency(s.value)}</p>
                  {s.photo_path && (
                    <button onClick={() => setPhotoModal(s.photo_path)} className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                      <Image size={12} /> Ver foto
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {photoModal && <PhotoModal path={photoModal} onClose={() => setPhotoModal(null)} />}
      </div>
    </MechanicLayout>
  );
}

function ServiceThumb({ path }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    axios.get(`${API}/services/photo/${path}`, { responseType: "blob", withCredentials: true })
      .then(r => { url = URL.createObjectURL(r.data); setSrc(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [path]);
  if (!src) return <div className="w-full h-full bg-slate-200 animate-pulse-bg"></div>;
  return <img src={src} alt="" className="w-full h-full object-cover" />;
}
