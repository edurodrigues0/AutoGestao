import { useState, useEffect, useCallback, useRef } from "react";
import { MechanicLayout } from "../components/Layout";
import { Camera, Image, X } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function PhotoModal({ path, onClose }) {
  const [src, setSrc] = useState(null);

  useEffect(function loadPhotoInModalOnMount() {
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
  const [editModal, setEditModal] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/services`, { withCredentials: true });
      setServices(data.services || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalValue = services.reduce((acc, s) => acc + (s.value || 0), 0);

  return (
    <MechanicLayout title="Meus Serviços">
      <div className="p-4 space-y-4">
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
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse-bg"></div>)}
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <Camera size={36} className="text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Nenhum serviço encontrado</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-50" data-testid="my-services-list">
            {services.map(s => (
              <div key={s.id} className="px-4 py-4 flex items-start gap-3 relative">
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
                <div className="flex-1 min-w-0 pr-8">
                  <p className="text-sm font-semibold text-slate-900">{s.client_name}</p>
                  {s.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{s.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">{new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col justify-between items-end h-full">
                  <p className="text-base font-bold text-slate-900">{formatCurrency(s.value)}</p>
                  <button
                    onClick={() => setEditModal(s)}
                    className="text-xs text-blue-600 flex items-center gap-1 mt-auto bg-blue-50 px-2 py-1 rounded-md"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {photoModal && <PhotoModal path={photoModal} onClose={() => setPhotoModal(null)} />}
        {editModal && <EditServiceModal service={editModal} onClose={() => { setEditModal(null); load(); }} />}
      </div>
    </MechanicLayout>
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
        value: parseFloat(form.value) || service.value, // Keep old value if not editing
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
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 h-20 bg-blue-50 text-blue-600 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-blue-200"><span className="text-[10px] font-bold">CÂMERA</span></button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 h-20 bg-slate-50 text-slate-500 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200"><span className="text-[10px] font-bold">GALERIA</span></button>
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

function ServiceThumb({ path }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    axios.get(`${API}/services/photo/${path}`, { responseType: "blob", withCredentials: true })
      .then(r => { url = URL.createObjectURL(r.data); setSrc(url); })
      .catch(() => { });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [path]);
  if (!src) return <div className="w-full h-full bg-slate-200 animate-pulse-bg"></div>;
  return <img src={src} alt="" className="w-full h-full object-cover" />;
}
