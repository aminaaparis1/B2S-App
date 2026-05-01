"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useRouter } from "next/navigation";
import { Calendar, FileText, Download, CheckCircle2, ChevronRight, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function SeancesPage() {
  const [seances, setSeances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchSeances() {
      const { data, error } = await supabase
        .from("seances")
        .select("*")
        .order("date_debut", { ascending: true });
      
      if (data) setSeances(data);
      setLoading(false);
    }
    fetchSeances();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#76D7B1]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 pb-32 max-w-md mx-auto font-sans text-black">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
          Planning <br />
          <span className="text-[#76D7B1]">des séances</span>
        </h1>
        <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] mt-2">
          Programme pédagogique B2S
        </p>
      </div>

      {/* Liste des séances */}
      <div className="space-y-8">
        {seances.map((seance, index) => {
          const isPast = new Date(seance.date_debut) < new Date();
          
          return (
            <div key={seance.id} className="relative">
              {/* Ligne verticale de liaison */}
              {index !== seances.length - 1 && (
                <div className="absolute left-6 top-14 bottom-[-2rem] w-[2px] bg-gray-100"></div>
              )}

              <div className={`flex gap-6 ${isPast ? 'opacity-50' : ''}`}>
                {/* Date Bulle */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex flex-col items-center justify-center border-2 ${
                  isPast ? 'bg-gray-100 border-gray-200' : 'bg-black border-black text-white shadow-lg shadow-black/20'
                }`}>
                  <span className="text-[10px] font-black uppercase">{format(new Date(seance.date_debut), "MMM", { locale: fr })}</span>
                  <span className="text-sm font-black leading-none">{format(new Date(seance.date_debut), "dd")}</span>
                </div>

                {/* Contenu Card */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      seance.type === 'Soutien' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {seance.type || "Séance"}
                    </span>
                    {isPast && <CheckCircle2 size={12} className="text-green-500" />}
                  </div>
                  
                  <h3 className="text-lg font-black uppercase italic leading-tight">{seance.titre}</h3>
                  
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold uppercase">
                      <Clock size={12} />
                      <span>{format(new Date(seance.date_debut), "HH:mm")} - {format(new Date(seance.date_fin), "HH:mm")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold uppercase">
                      <MapPin size={12} />
                      <span>{seance.lieu || "Local B2S"}</span>
                    </div>
                  </div>

                  {/* Documents attachés (Simulation) */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 px-3 py-2 rounded-xl transition-all">
                      <FileText size={14} className="text-[#76D7B1]" />
                      <span className="text-[9px] font-black uppercase">Fiche_Exos.pdf</span>
                      <Download size={12} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {seances.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-[3rem]">
          <Calendar className="mx-auto text-gray-200 mb-4" size={48} />
          <p className="text-gray-400 font-black italic uppercase text-sm">Aucun planning publié</p>
        </div>
      )}
    </div>
  );
}