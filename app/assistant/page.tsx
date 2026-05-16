"use client";
import Link from "next/link";
import { MessageSquareQuote, GraduationCap, Sparkles, ChevronRight, Bot } from "lucide-react"; // ✅ Import de Bot

export default function AssistantHubPage() {
  return (
    <div className="min-h-screen bg-white p-6 pb-24 max-w-md mx-auto font-sans text-black flex flex-col">
      
      {/* HEADER : Calé proprement en haut */}
      <header className="mt-4 mb-2 text-center">
        <div className="inline-flex items-center justify-center bg-[#C2F3E1]/40 px-3 py-1 rounded-full text-[#52b792] font-black text-[9px] uppercase tracking-widest gap-1 mb-3">
          <Sparkles size={10} className="fill-current" /> Espace Intuitif
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
          Espace IA
        </h1>
        <p className="text-gray-400 font-bold text-xs mt-1.5">
          Propulse tes révisions avec les outils B2S
        </p>
      </header>

      {/* SECTION BOUTONS : Regroupée plus haut sans le grand vide */}
      <div className="mt-10 space-y-4">
        
        {/* OPTION 1 : CHATBOT */}
        <Link 
          href="/chat"
          className="flex items-center justify-between bg-gray-50 p-6 rounded-[2rem] border-2 border-gray-100/70 hover:border-[#76D7B1] hover:bg-white transition-all active:scale-[0.98] text-left group shadow-sm hover:shadow-md"
        >
          <div className="flex items-center gap-5">
            <div className="bg-[#C2F3E1] p-4 rounded-2xl text-black transition-transform group-hover:scale-110 duration-300">
              <MessageSquareQuote size={24} />
            </div>
            <div className="max-w-[180px]">
              <h2 className="text-sm font-black uppercase tracking-tight text-black">Le Chatbot</h2>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5 leading-tight">
                Pose tes questions et obtiens des explications immédiates.
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
        </Link>

        {/* OPTION 2 : GÉNÉRATEUR D'EXERCICES */}
        <Link 
          href="/exercises"
          className="flex items-center justify-between bg-gray-50 p-6 rounded-[2rem] border-2 border-gray-100/70 hover:border-[#76D7B1] hover:bg-white transition-all active:scale-[0.98] text-left group shadow-sm hover:shadow-md"
        >
          <div className="flex items-center gap-5">
            <div className="bg-[#C2F3E1] p-4 rounded-2xl text-black transition-transform group-hover:scale-110 duration-300">
              <GraduationCap size={24} />
            </div>
            <div className="max-w-[180px]">
              <h2 className="text-sm font-black uppercase tracking-tight text-black">Générateur d'exercices</h2>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5 leading-tight">
                Évalue-toi instantanément avec un QCM de 10 questions sur ton chapitre.
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all" />
        </Link>
        
      </div>

      {/* SECTION ASTUCE : Version Robot IA */}
      <div className="mt-8 p-5 bg-gray-50/50 rounded-[2rem] border border-gray-100 flex items-start gap-3.5">
        <div className="bg-[#C2F3E1] p-2.5 rounded-xl text-[#449e7d] mt-0.5 shadow-sm">
          <Bot size={16} />
        </div>
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
            L'astuce de B2S Bot
          </h4>
          <p className="text-[11px] text-gray-400 font-bold mt-1 leading-tight">
            Utilise d'abord le Chatbot pour éclaircir tes zones d'ombre, puis lance un entraînement sur le Générateur pour valider tes acquis !
          </p>
        </div>
      </div>

    </div>
  );
}