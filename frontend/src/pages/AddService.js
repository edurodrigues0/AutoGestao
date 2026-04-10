import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AdminLayout, MechanicLayout } from "../components/Layout";
import { Camera, Image, X, CheckCircle, AlertCircle, DollarSign, User } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function AddServiceContent() {
  const [form, setForm] = useState({ client_name: "", description: "", value: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione uma imagem");
      return;
    }
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    setError("");
  };

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleValueInput = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    const num = parseFloat(raw) / 100;
    setForm(f => ({ ...f, value: raw ? num.toString() : "" }));
  };

  const getDisplayValue = () => {
    if (!form.value) return "";
    return formatCurrency(parseFloat(form.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) { setError("Nome do cliente é obrigatório"); return; }
    if (!form.value || parseFloat(form.value) <= 0) { setError("Valor do serviço é obrigatório"); return; }
    setError("");
    setSaving(true);

    try {
      let photoPath = null;
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

      await axios.post(`${API}/services`, {
        client_name: form.client_name.trim(),
        description: form.description.trim() || null,
        value: parseFloat(form.value),
        photo_path: photoPath
      }, { withCredentials: true });

      setSuccess(true);
      setForm({ client_name: "", description: "", value: "" });
      setPhotoFile(null);
      setPhotoPreview(null);

      setTimeout(() => {
        if (user?.role === "mechanic") navigate("/mechanic/dashboard");
        else navigate("/admin/dashboard");
      }, 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Erro ao registrar serviço");
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>Serviço registrado!</h2>
        <p className="text-slate-500">Redirecionando...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-4 max-w-lg mx-auto" data-testid="add-service-form">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3" data-testid="service-error">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Photo upload */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Foto do Serviço</label>
        {photoPreview ? (
          <div className="relative rounded-xl overflow-hidden bg-slate-100">
            <img src={photoPreview} alt="Preview" className="w-full h-52 object-cover" data-testid="photo-preview" />
            <button
              type="button"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center hover:bg-red-50"
              data-testid="remove-photo-btn"
            >
              <X size={16} className="text-slate-600" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-3">
              {/* Camera button (mobile - opens camera directly) */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 py-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-fast"
                data-testid="camera-btn"
              >
                <Camera size={24} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Câmera</span>
              </button>
              {/* Gallery button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 py-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-fast"
                data-testid="gallery-btn"
              >
                <Image size={24} className="text-slate-500" />
                <span className="text-xs font-semibold text-slate-500">Galeria</span>
              </button>
            </div>
          </div>
        )}
        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          className="hidden"
          data-testid="camera-input"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
          data-testid="file-input"
        />
      </div>

      {/* Client name */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
          Nome do Cliente *
        </label>
        <div className="relative">
          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            name="client_name"
            value={form.client_name}
            onChange={handleChange}
            required
            placeholder="Nome do cliente"
            className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 bg-white transition-fast"
            data-testid="service-client-name"
          />
        </div>
      </div>

      {/* Value */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
          Valor do Serviço *
        </label>
        <div className="relative">
          <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            inputMode="numeric"
            value={getDisplayValue()}
            onChange={handleValueInput}
            placeholder="R$ 0,00"
            required
            className="w-full h-14 pl-11 pr-4 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 bg-white text-xl font-bold transition-fast"
            data-testid="service-value"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
          Descrição <span className="text-slate-300 normal-case font-normal tracking-normal">(opcional)</span>
        </label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Descreva o serviço realizado..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 bg-white resize-none transition-fast"
          data-testid="service-description"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition-fast"
        data-testid="save-service-btn"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Enviando foto...
          </div>
        ) : saving ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Salvando...
          </div>
        ) : "Registrar Serviço"}
      </button>
    </form>
  );
}

export default function AddService() {
  const { user } = useAuth();

  if (user?.role === "mechanic") {
    return <MechanicLayout title="Registrar Serviço"><AddServiceContent /></MechanicLayout>;
  }

  return <AdminLayout title="Registrar Serviço"><AddServiceContent /></AdminLayout>;
}
