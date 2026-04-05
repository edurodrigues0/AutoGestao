import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { Search, Filter, Trash2, Image, ChevronDown, X, Edit2 } from "lucide-react";
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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow z-10">
          <X size={16} className="text-slate-700" />
        </button>
        {src ? (
          <img src={src} alt="Serviço" className="w-full rounded-2xl max-h-[80vh] object-contain" />
        ) : (
          <div className="bg-slate-900 rounded-2xl h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesAdmin() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mechanics, setMechanics] = useState([]);
  const [photoModal, setPhotoModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filters, setFilters] = useState({ mechanic_id: "", client_name: "", start_date: "", end_date: "" });
  const [showFilters, setShowFilters] = useState(false);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.mechanic_id) params.mechanic_id = filters.mechanic_id;
      if (filters.client_name) params.client_name = filters.client_name;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      const { data } = await axios.get(`${API}/services`, { params, withCredentials: true });
      setServices(data.services || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadServices(); }, [loadServices]);

  useEffect(() => {
    axios.get(`${API}/mechanics`, { withCredentials: true })
      .then(({ data }) => setMechanics(data.mechanics || []))
      .catch(() => { });
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Remover este serviço?")) return;
    setDeleting(id);
    try {
      await axios.delete(`${API}/services/${id}`, { withCredentials: true });
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err) { alert("Erro ao remover serviço"); }
    finally { setDeleting(null); }
  };

  const clearFilters = () => setFilters({ mechanic_id: "", client_name: "", start_date: "", end_date: "" });
  const hasFilters = Object.values(filters).some(Boolean);

  const totalValue = services.reduce((acc, s) => acc + (s.value || 0), 0);

  return (
    <AdminLayout title="Todos os Serviços">
      <div className="space-y-4 animate-fade-in">
        {/* Search + Filter bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Buscar por cliente..."
                value={filters.client_name}
                onChange={e => setFilters(f => ({ ...f, client_name: e.target.value }))}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none text-sm text-slate-900"
                data-testid="search-client"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 h-10 px-4 rounded-lg border text-sm font-medium transition-fast ${showFilters ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              data-testid="toggle-filters"
            >
              <Filter size={16} />
              Filtros
              {hasFilters && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Mecânico</label>
                <select
                  value={filters.mechanic_id}
                  onChange={e => setFilters(f => ({ ...f, mechanic_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 outline-none"
                  data-testid="filter-mechanic"
                >
                  <option value="">Todos os mecânicos</option>
                  {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">De</label>
                <input type="date" value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 outline-none" data-testid="filter-start-date" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">Até</label>
                <input type="date" value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:border-blue-500 outline-none" data-testid="filter-end-date" />
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="sm:col-span-3 text-xs text-slate-500 hover:text-red-600 text-left transition-fast" data-testid="clear-filters">
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{total} serviços encontrados</span>
          <span className="font-bold text-slate-900">{formatCurrency(totalValue)} total</span>
        </div>

        {/* Services table/list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="services-list">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="p-12 text-center">
              <Search size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400">Nenhum serviço encontrado</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Mecânico</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Descrição</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-slate-400">Foto</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-widest text-slate-400">Valor</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {services.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-fast">
                        <td className="px-4 py-3 text-sm text-slate-500">{new Date(s.created_at).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.mechanic_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-900 font-medium">{s.client_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">{s.description || "-"}</td>
                        <td className="px-4 py-3">
                          {s.photo_path ? (
                            <button onClick={() => setPhotoModal(s.photo_path)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium" data-testid={`view-photo-${s.id}`}>
                              <Image size={14} /> Ver
                            </button>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{formatCurrency(s.value)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditModal(s)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-600 transition-fast"
                              data-testid={`edit-service-${s.id}`}
                              title="Editar"
                            >
                              <Edit2 size={15} /> {/* Reusing search icon as pencil if needed or import Edit */}
                            </button>
                            {user?.role === "admin" && (
                              <button
                                onClick={() => handleDelete(s.id)}
                                disabled={deleting === s.id}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-fast"
                                data-testid={`delete-service-${s.id}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-slate-50">
                {services.map(s => (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{s.client_name}</p>
                        <p className="text-xs text-slate-500">{s.mechanic_name} • {new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
                        {s.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{s.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {s.photo_path && (
                          <button onClick={() => setPhotoModal(s.photo_path)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                            <Image size={16} />
                          </button>
                        )}
                        <button onClick={() => setEditModal(s)} className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                          <Edit2 size={16} />
                        </button>
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(s.value)}</span>
                        {user?.role === "admin" && (
                          <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id} className="p-1.5 text-slate-300 hover:text-red-500">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {photoModal && <PhotoModal path={photoModal} onClose={() => setPhotoModal(null)} />}
        {editModal && <EditServiceModal service={editModal} onClose={() => { setEditModal(null); loadServices(); }} />}
      </div>
    </AdminLayout>
  );
}

function EditServiceModal({ service, onClose }) {
  const [form, setForm] = useState({ client_name: service.client_name, description: service.description || "", value: service.value.toString() });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(service.photo_path || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const formatBRL = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleValueInput = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    const num = parseFloat(raw) / 100;
    setForm(f => ({ ...f, value: raw ? num.toString() : "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let photoPath = service.photo_path;
      if (photoFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", photoFile);
        const { data: uploadData } = await axios.post(`${API}/services/upload-photo`, formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" }
        });
        photoPath = uploadData.path;
        setUploading(false);
      }

      await axios.put(`${API}/services/${service.id}`, {
        client_name: form.client_name,
        description: form.description,
        value: parseFloat(form.value),
        photo_path: photoPath
      }, { withCredentials: true });

      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Editar Serviço</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Cliente</label>
            <input
              value={form.client_name}
              onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-fast"
              required
            />
          </div>

          {user?.role === "admin" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Valor</label>
              <input
                value={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(form.value))}
                onChange={handleValueInput}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-lg"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full p-4 rounded-xl border border-slate-200 focus:border-blue-500 outline-none resize-none transition-fast"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Foto</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 h-20 bg-blue-50 text-blue-600 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-blue-200"><Plus size={20} /> <span className="text-[10px] font-bold">CÂMERA</span></button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 h-20 bg-slate-50 text-slate-500 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200"><Plus size={20} /> <span className="text-[10px] font-bold">GALERIA</span></button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </div>
            {photoPreview && <p className="text-[10px] text-green-600 font-bold mt-2">✓ Foto selecionada</p>}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-fast shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Salvar Alterações"}
          </button>
        </form>
      </div>
    </div>
  );
}
