import { Link } from "react-router-dom";
import { Wrench, Shield, BarChart3, Camera, CheckCircle, ArrowRight, Smartphone, Star } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1645445522156-9ac06bc7a767?q=70&w=1200";
const FEATURES_IMG = "https://images.pexels.com/photos/5276374/pexels-photo-5276374.jpeg?auto=compress&cs=tinysrgb&w=600";

const plans = [
  { id: "basic", name: "Básico", price: "69,90", mechanics: "2 mecânicos", color: "border-slate-200", bg: "bg-white", btnClass: "bg-slate-900 text-white hover:bg-slate-800" },
  { id: "pro", name: "Pro", price: "149,90", mechanics: "5 mecânicos", color: "border-blue-600", bg: "bg-blue-600", featured: true, btnClass: "bg-white text-blue-600 hover:bg-blue-50" },
  { id: "premium", name: "Premium", price: "249,90", mechanics: "Ilimitado", color: "border-slate-200", bg: "bg-white", btnClass: "bg-slate-900 text-white hover:bg-slate-800" },
];

const features = [
  { icon: Camera, title: "Foto do Serviço", desc: "Capture diretamente pela câmera do celular. Rápido e sem complicação." },
  { icon: Shield, title: "Privacidade Total", desc: "Cada mecânico vê apenas os próprios serviços. Dados protegidos." },
  { icon: BarChart3, title: "Comissão Automática", desc: "Cálculo automático de comissão mensal. Sem planilhas manuais." },
  { icon: Smartphone, title: "Mobile First", desc: "Interface otimizada para celular. Feito para o dia a dia da oficina." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wrench size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>AutoGestão</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-fast px-3 py-2" data-testid="nav-login">
              Entrar
            </Link>
            <Link to="/register" className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-fast" data-testid="nav-register">
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 min-h-screen flex items-center">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Mecânico trabalhando" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-900/70"></div>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <div className="max-w-2xl animate-fade-in">
            <span className="inline-block bg-blue-600/20 border border-blue-400/30 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-widest uppercase">
              Sistema para Oficinas
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6" style={{ fontFamily: 'Outfit' }}>
              Gerencie sua<br />
              <span className="text-blue-400">oficina no celular</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Substitua o WhatsApp por um sistema profissional. Registre serviços com foto, controle comissões e visualize relatórios completos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-700 transition-fast text-base"
                data-testid="hero-cta"
              >
                Começar Agora
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-fast text-base"
                data-testid="hero-login"
              >
                Já tenho conta
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-8">
              {["Sem cartão de crédito", "Ativação imediata", "Suporte em PT"].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>
              Tudo que sua oficina precisa
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Sistema completo, simples de usar e feito para o dia a dia corrido da oficina.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-xl p-6 card-hover">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={24} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2 text-base" style={{ fontFamily: 'Outfit' }}>{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile showcase */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6" style={{ fontFamily: 'Outfit' }}>
                Interface pensada<br />para o mecânico
              </h2>
              <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                Registrar um serviço leva menos de 30 segundos. Foto pela câmera, nome do cliente, valor — pronto.
              </p>
              <ul className="space-y-4">
                {[
                  "Botão de registrar sempre visível",
                  "Câmera abre diretamente para a foto",
                  "Valores em tempo real",
                  "Comissão calculada automaticamente"
                ].map(item => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <img
                src={FEATURES_IMG}
                alt="Mecânico usando celular"
                className="rounded-2xl w-full object-cover h-80 lg:h-96"
              />
              <div className="absolute -bottom-4 -left-4 bg-blue-600 text-white rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <p className="text-xs opacity-75">Este mês</p>
                    <p className="font-bold text-lg" style={{ fontFamily: 'Outfit' }}>R$ 12.450</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit' }}>
              Planos simples e transparentes
            </h2>
            <p className="text-slate-400 text-lg">Escolha o plano ideal para o tamanho da sua oficina</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`${plan.featured ? "bg-blue-600 border-blue-500" : "bg-slate-800 border-slate-700"} border-2 rounded-2xl p-8 relative`}
                data-testid={`plan-${plan.id}`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                      Mais Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit' }}>{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>R$ {plan.price}</span>
                  <span className={`text-sm ${plan.featured ? "text-blue-100" : "text-slate-400"}`}>/mês</span>
                </div>
                <p className={`text-sm mb-6 ${plan.featured ? "text-blue-100" : "text-slate-400"}`}>{plan.mechanics}</p>
                <ul className="space-y-3 mb-8">
                  {["Serviços ilimitados", "Upload de fotos", "Cálculo de comissão", "Relatórios PDF/Excel"].map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle size={15} className={plan.featured ? "text-blue-200" : "text-green-400"} />
                      <span className={`text-sm ${plan.featured ? "text-blue-100" : "text-slate-300"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/register?plan=${plan.id}`}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-fast ${plan.featured ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  data-testid={`plan-${plan.id}-cta`}
                >
                  Começar Agora
                  <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Wrench size={14} className="text-white" />
            </div>
            <span className="font-bold text-white" style={{ fontFamily: 'Outfit' }}>AutoGestão</span>
          </div>
          <p className="text-sm">© 2024 AutoGestão. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
