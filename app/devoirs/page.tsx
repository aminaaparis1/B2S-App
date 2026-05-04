"use client";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "../../src/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Circle, FileText, Plus, ArrowLeft, ChevronRight, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function DevoirsList() {
  const [devoirsAFaire, setDevoirsAFaire] = useState<any[]>([]);
  const [devoirsFaits, setDevoirsFaits] = useState<any[]>([]);
  const [totalFaits, setTotalFaits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const eleveIdParam = searchParams.get("eleveId");
  const isParentView = searchParams.get("view") === "parent";

  const FAITS_PAR_PAGE = 3;

  useEffect(() => {
    fetchData();
  }, [eleveIdParam]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }

    const targetEleveId = eleveIdParam || user.id;

    // Devoirs à faire
    const { data: aFaire } = await supabase
      .from("devoirs")
      .select("*, fichiers (id, nom_fichier, url_storage)")
      .eq("eleve_id", targetEleveId)
      .eq("statut", "a_faire")
      .order("date", { ascending: true });

    // 3 derniers devoirs faits
    const { data: faits, count } = await supabase
      .from("devoirs")
      .select("*, fichiers (id, nom_fichier, url_storage)", { count: "exact" })
      .eq("eleve_id", targetEleveId)
      .eq("statut", "fait")
      .order("date", { ascending: false })
      .limit(FAITS_PAR_PAGE);

    setDevoirsAFaire(aFaire || []);
    setDevoirsFaits(faits || []);
    setTotalFaits(count || 0);
    setLoading(false);
  };

  const loadMoreFaits = async () => {
    setLoadingMore(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetEleveId = eleveIdParam || user.id;

    const { data: plusDeFaits } = await supabase
      .from("devoirs")
      .select("*, fichiers (id, nom_fichier, url_storage)")
      .eq("eleve_id", targetEleveId)
      .eq("statut", "fait")
      .order("date", { ascending: false })
      .range(devoirsFaits.length, devoirsFaits.length + FAITS_PAR_PAGE - 1);

    if (plusDeFaits) setDevoirsFaits([...devoirsFaits, ...plusDeFaits]);
    setLoadingMore(false);
  };

  const toggleStatut = async (id: string, statutActuel: string) => {
    setToggling(id);
    const nouveauStatut = statutActuel === "fait" ? "a_faire" : "fait";

    const { error } = await supabase
      .from("devoirs")
      .update({ statut: nouveauStatut })
      .eq("id", id);

    if (!error) {
      if (nouveauStatut === "fait") {
        // Déplacer de à_faire vers faits
        const devoir = devoirsAFaire.find(d => d.id === id);
        if (devoir) {
          setDevoirsAFaire(devoirsAFaire.filter(d => d.id !== id));
          setDevoirsFaits([{ ...devoir, statut: "fait" }, ...devoirsFaits]);
          setTotalFaits(t => t + 1);
        }
      } else {
        // Déplacer de faits vers à_faire
        const devoir = devoirsFaits.find(d => d.id === id);
        if (devoir) {
          setDevoirsFaits(devoirsFaits.filter(d => d.id !== id));
          setDevoirsAFaire([...devoirsAFaire, { ...devoir, statut: "a_faire" }]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
          setTotalFaits(t => t - 1);
        }
      }
    }
    setToggling(null);
  };

  const DevoirCard = ({ d, fait }: { d: any; fait: boolean }) => (
    <div className={`bg-white p-5 rounded-[2.2rem] border-2 border-gray-100 shadow-[0_10px_25px_rgba(0,0,0,0.05)] flex items-center gap-4 transition-all ${fait ? "opacity-60" : ""}`}>
      
      {/* Checkbox */}
      <button
        onClick={() => toggleStatut(d.id, d.statut)}
        disabled={toggling === d.id}
        className="shrink-0 active:scale-90 transition-all disabled:opacity-50"
      >
        {fait ? (
          <CheckCircle2 className="w-8 h-8 text-[#76D7B1]" />
        ) : (
          <Circle className="w-8 h-8 text-black" strokeWidth={2.5} />
        )}
      </button>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden" onClick={() => router.push(`/devoirs/${d.id}`)}>
        <p className={`font-black text-black text-base leading-tight ${fait ? "line-through" : ""}`}>
          {d.date ? format(new Date(d.date), "EEEE d MMMM", { locale: fr }) : "Sans date"}
        </p>
        <div className="mt-1">
          <span className="text-black uppercase text-[10px] font-black opacity-50 tracking-widest block">
            {d.matiere}
          </span>
          <p className="text-gray-700 font-bold text-sm truncate">{d.description}</p>
        </div>
        {d.fichiers && d.fichiers.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-black bg-gray-50 px-2 py-1 rounded-lg w-fit border border-gray-100">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[9px] font-bold">Document joint</span>
          </div>
        )}
      </div>

      {/* Flèche détail */}
      <button
        onClick={() => router.push(`/devoirs/${d.id}`)}
        className="p-2 hover:bg-gray-50 rounded-full active:translate-x-1 transition-all shrink-0"
      >
        <ChevronRight className="text-black w-7 h-7 stroke-[3px]" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-6 pb-24 max-w-md mx-auto font-sans">

      {/* Header */}
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

        {/* Bouton ajouter : élève ou parent */}
        {(!eleveIdParam || isParentView) && (
          <button
            onClick={() => {
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

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-full bg-gray-50 animate-pulse rounded-[2.2rem]" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Section À faire ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                À faire
              </h2>
              {devoirsAFaire.length > 0 && (
                <span className="bg-black text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                  {devoirsAFaire.length}
                </span>
              )}
            </div>

            {devoirsAFaire.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-[2rem]">
                <p className="font-black text-gray-300 text-lg">Aucun devoir à faire 🎉</p>
              </div>
            ) : (
              <div className="space-y-4">
                {devoirsAFaire.map((d) => (
                  <DevoirCard key={d.id} d={d} fait={false} />
                ))}
              </div>
            )}
          </div>

          {/* ── Section Terminés ── */}
          {(devoirsFaits.length > 0 || totalFaits > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Terminés
                </h2>
                <span className="bg-gray-200 text-gray-500 text-[9px] font-black px-2 py-0.5 rounded-full">
                  {totalFaits}
                </span>
              </div>

              <div className="space-y-4">
                {devoirsFaits.map((d) => (
                  <DevoirCard key={d.id} d={d} fait={true} />
                ))}
              </div>

              {/* Bouton voir plus */}
              {devoirsFaits.length < totalFaits && (
                <button
                  onClick={loadMoreFaits}
                  disabled={loadingMore}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3 border-2 border-gray-100 rounded-[1.5rem] text-gray-400 font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Voir plus
                    </>
                  )}
                </button>
              )}
            </div>
          )}

        </div>
      )}
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