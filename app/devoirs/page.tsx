"use client";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "../../src/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, CheckCircle2, Circle, FileText, Plus, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function DevoirsList() {
  const [devoirs, setDevoirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const eleveIdParam = searchParams.get("eleveId");
  const isParentView = searchParams.get("view") === "parent";

  useEffect(() => {
    fetchData();
  }, [eleveIdParam]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/");
      return;
    }

    // Si on a un eleveId dans l'URL (Bénévole/Parent), on cible cet élève.
    // Sinon, c'est l'élève connecté qui voit ses propres devoirs.
    const targetEleveId = eleveIdParam || user.id;

    const { data, error } = await supabase
      .from("devoirs")
      .select(`
        *,
        fichiers (id, nom_fichier, url_storage)
      `)
      .eq("eleve_id", targetEleveId)
      .order("date", { ascending: true });

    if (error) console.error("Erreur de récupération:", error);
    if (data) setDevoirs(data);
    setLoading(false);
  };

  const toggleStatut = async (id: string, statutActuel: string) => {
    // Sécurité : Un parent ou un bénévole ne peut pas cocher
    if (eleveIdParam) return;

    const nouveauStatut = statutActuel === "Fait" ? "A faire" : "Fait";
    const { error } = await supabase
      .from("devoirs")
      .update({ statut: nouveauStatut })
      .eq("id", id);

    if (!error) {
      setDevoirs(devoirs.map(d => d.id === id ? { ...d, statut: nouveauStatut } : d));
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 pb-24 max-w-md mx-auto font-sans">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <div className="flex items-center gap-3">
          {eleveIdParam && (
            <button 
              onClick={() => router.back()} 
              className="p-2 bg-gray-100 rounded-xl active:scale-90 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
          )}
          <h1 className="text-3xl font-black text-black">
            {eleveIdParam ? "Ses devoirs" : "Devoirs"}
          </h1>
        </div>

        {/* BOUTON AJOUTER : Visible pour l'élève OU pour le Parent */}
        {(!eleveIdParam || isParentView) && (
          <button
            onClick={() => {
              // Si parent, on transmet l'ID de l'enfant pour la page d'ajout
              const url = isParentView 
                ? `/devoirs/add?eleveId=${eleveIdParam}` 
                : "/devoirs/add";
              router.push(url);
            }}
            className="bg-[#76D7B1] text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            Ajouter <Plus className="w-5 h-5 stroke-[3px]" />
          </button>
        )}
      </div>

      {/* --- LISTE DES DEVOIRS --- */}
      <div className="space-y-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 w-full bg-gray-50 animate-pulse rounded-[2.2rem]" />
            ))}
          </div>
        ) : devoirs.length > 0 ? (
          devoirs.map((d) => (
            <div 
              key={d.id} 
              className={`bg-white p-5 rounded-[2.2rem] border-2 border-gray-100 shadow-[0_10px_25px_rgba(0,0,0,0.05)] flex items-center gap-4 transition-all ${d.statut === 'Fait' ? 'opacity-60' : ''}`}
            >
              {/* Cercle de validation (désactivé pour Parent/Bénévole) */}
              <button 
                onClick={() => toggleStatut(d.id, d.statut)}
                className={`shrink-0 ${eleveIdParam ? 'cursor-default' : 'active:scale-90'}`}
              >
                {d.statut === 'Fait' ? (
                  <CheckCircle2 className="w-8 h-8 text-[#76D7B1]" />
                ) : (
                  <Circle className={`w-8 h-8 ${eleveIdParam ? 'text-gray-200' : 'text-black'}`} strokeWidth={2.5} />
                )}
              </button>

              {/* Contenu du devoir */}
              <div className="flex-1 overflow-hidden" onClick={() => router.push(`/devoirs/${d.id}`)}>
                <p className="font-black text-black text-base leading-tight">
                  {d.date ? format(new Date(d.date), "EEEE d MMMM", { locale: fr }) : "Sans date"}
                </p>
                <div className="mt-1">
                  <span className="text-black uppercase text-[10px] font-black opacity-50 tracking-widest block">
                    {d.matiere}
                  </span>
                  <p className="text-gray-700 font-bold text-sm truncate">
                    {d.description}
                  </p>
                </div>

                {d.fichiers && d.fichiers.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-black bg-gray-50 px-2 py-1 rounded-lg w-fit border border-gray-100">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[9px] font-bold">Document joint</span>
                  </div>
                )}
              </div>

              {/* Flèche détails */}
              <button 
                onClick={() => router.push(`/devoirs/${d.id}`)}
                className="p-2 hover:bg-gray-50 rounded-full active:translate-x-1 transition-all"
              >
                <ChevronRight className="text-black w-7 h-7 stroke-[3px]" />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <p className="font-black text-gray-300 text-xl">Aucun devoir trouvé ! 🎉</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DevoirsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold text-[#76D7B1]">Chargement...</div>}>
      <DevoirsList />
    </Suspense>
  );
}