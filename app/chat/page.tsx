"use client";
import { useState, useRef, useEffect } from 'react';
import { searchContext } from "../../src/services/ai/search";
import { ingestFolder } from "../../src/services/ai/ingestion";
import { Send, GraduationCap, Sparkles, Loader2, Database } from "lucide-react";

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers le bas de la discussion à chaque nouveau message
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Détection lexicale de la matière pour optimiser les performances de filtrage de la BDD
  const detectMatiere = (text: string): string | null => {
    const lower = text.toLowerCase();
    if (lower.includes("math")) return "Mathématiques";
    if (lower.includes("francais") || lower.includes("français") || lower.includes("objet d'etude") || lower.includes("objets d'étude")) return "Français";
    if (lower.includes("espagnol")) return "Espagnol (LV1/LV2)";
    if (lower.includes("allemand")) return "Allemand (LV1/LV2)";
    if (lower.includes("anglais")) return "Anglais (LV1/LV2)";
    if (lower.includes("ses")) return "Sciences Économiques et Sociales";
    if (lower.includes("snt")) return "Sciences Numériques et Technologie";
    if (lower.includes("histoire") || lower.includes("geo") || lower.includes("géo")) return "Histoire-Géographie";
    if (lower.includes("svt")) return "Sciences de la Vie et de la Terre";
    if (lower.includes("physique") || lower.includes("chimie")) return "Physique-Chimie";
    return null;
  };

  // Traitement séquentiel de l'ingestion globale de l'arborescence locale
  const handleIngest = async () => {
    setIsIngesting(true);
    try {
      const matieres = [
        { folder: "maths", label: "Mathématiques" },
        { folder: "francais", label: "Français" },
        { folder: "histoire_geo", label: "Histoire-Géographie" },
        { folder: "svt", label: "Sciences de la Vie et de la Terre" },
        { folder: "physique_chimie", label: "Physique-Chimie" },
        { folder: "ses", label: "Sciences Économiques et Sociales" },
        { folder: "snt", label: "Sciences Numériques et Technologie" },
        { folder: "anglais", label: "Anglais (LV1/LV2)" },
        { folder: "espagnol", label: "Espagnol (LV1/LV2)" },
        { folder: "allemand", label: "Allemand (LV1/LV2)" }
      ];

      console.log("🚀 Lancement de l'ingestion globale de la base B2S...");

      for (const matiere of matieres) {
        console.log(`✨ Ingestion lancée pour : ${matiere.label}`);
        // Appel de la méthode d'ingestion (le niveau est dynamiquement calculé par le script d'ingestion)
        await ingestFolder(`data/programmes/${matiere.folder}`, matiere.label);
      }
      
      alert("Toutes les matières ont été filtrées, triées par niveau (hors CM1/CM2) et synchronisées ! 🎓✅");
    } catch (error: any) {
      console.error("Erreur d'ingestion :", error);
      alert("Erreur d'ingestion : " + error.message);
    } finally {
      setIsIngesting(false);
    }
  };

  // Gestion de la soumission de la requête élève et de l'orchestration RAG
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage = query;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setQuery("");
    setLoading(true);

    try {
      const matiereDetectee = detectMatiere(userMessage);

      // Récupération des 12 chunks les plus pertinents associés au filtre de matière identifié
      const contextDocs = await searchContext(userMessage, 12, matiereDetectee);
      const contextText = contextDocs.map((d: any) => d.content).join("\n---\n");

      // Envoi du package (Question + Contexte RAG) au modèle LLM (Groq API)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context: contextText }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: "Désolé, une erreur est survenue." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 pb-40 max-w-md mx-auto font-sans text-black">
      {/* HEADER AVEC ACTION INGESTION DB */}
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Assistant</h1>
          <p className="text-[#76D7B1] font-black text-[10px] uppercase tracking-widest mt-1 flex items-center gap-1">
            <Sparkles size={10} /> Intelligence B2S
          </p>
        </div>
        <button 
          onClick={handleIngest} 
          disabled={isIngesting}
          className="bg-gray-50 p-4 rounded-2xl border border-gray-100 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
        >
          {isIngesting ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : <Database className="w-5 h-5 text-black" />}
        </button>
      </header>

      {/* FIL DE DISCUSSION */}
      <div ref={scrollRef} className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 pb-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 text-center">
            <div className="w-16 h-16 bg-[#C2F3E1] rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="text-[#76D7B1] w-8 h-8" />
            </div>
            <p className="text-sm font-black uppercase italic tracking-tighter">Pose ta question</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Toutes matières • 6e à Seconde</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-5 rounded-[2rem] shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-black text-white rounded-tr-none border-black' 
                : 'bg-gray-50 text-black border-gray-100 rounded-tl-none'
            }`}>
              <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest mt-2 text-gray-300 px-2">
              {msg.role === 'user' ? 'Toi' : 'B2S Bot'}
            </span>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-gray-50 border border-gray-100 p-4 rounded-3xl rounded-tl-none">
              <Loader2 className="w-4 h-4 animate-spin text-[#76D7B1]" />
            </div>
          </div>
        )}
      </div>

      {/* FORMULAIRE DE CHAT FIXED INTERFACE */}
      <footer className="fixed bottom-24 left-0 right-0 p-6 bg-white/90 backdrop-blur-md max-w-md mx-auto z-50">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="TA QUESTION ICI..."
            className="w-full bg-gray-50 border-2 border-gray-100 p-5 pr-16 rounded-[2rem] text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#76D7B1] transition-all placeholder:text-gray-300 text-black shadow-inner"
          />
          <button 
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 bg-black text-white p-4 rounded-full active:scale-90 transition-all disabled:opacity-20 shadow-lg"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}