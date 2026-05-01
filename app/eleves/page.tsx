"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { FileDown, Book, Check, X, Loader2, UserX } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ElevesPage() {
  const [eleves, setEleves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [presences, setPresences] = useState<Record<string, any>>({});
  const [isAdminOrBenevole, setIsAdminOrBenevole] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const router = useRouter();
  
  const today = new Date().toLocaleDateString('en-CA'); 

  useEffect(() => {
    checkPermissions();
    fetchData();
  }, []);

  async function checkPermissions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role === "Admin" || profile?.role === "Benevole") setIsAdminOrBenevole(true);
  }

  async function fetchData() {
    try {
      setLoading(true);
      const { data: elevesData } = await supabase
        .from("eleves")
        .select(`id, parent_id, profiles (id, prenom, nom, avatar_key, avatar_seed)`);

      const { data: presencesData } = await supabase.from("presences").select().eq("date", today);

      if (elevesData) setEleves(elevesData);
      const presenceMap: Record<string, any> = {};
      presencesData?.forEach(p => { presenceMap[p.user_id] = p; });
      setPresences(presenceMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleStatutChange = async (eleve: any, nouveauStatut: string) => {
    const profileId = eleve.profiles.id;
    const current = presences[profileId];

    if (current) {
      const { data } = await supabase.from("presences").update({ statut: nouveauStatut }).eq("id", current.id).select().single();
      setPresences({ ...presences, [profileId]: data });
    } else {
      const { data } = await supabase.from("presences").insert({ user_id: profileId, statut: nouveauStatut, date: today }).select().single();
      setPresences({ ...presences, [profileId]: data });
    }

    if (nouveauStatut === "Absent") {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("notifications").insert([{
        expediteur_id: user?.id,
        destinataire_id: eleve.parent_id,
        message: `Bonjour, votre enfant ${eleve.profiles.prenom} est absent à la séance d'aujourd'hui.`,
        type: "absence",
      }]);
      alert(`Notification envoyée pour ${eleve.profiles.prenom}`);
    }
  };

  const handleExportPresences = async () => {
    setExporting(true);
    const { data: allPresences } = await supabase.from("presences").select(`date, statut, profiles (prenom, nom)`).order('date', { ascending: false });
    if (!allPresences) return;
    const samedisOnly = allPresences.filter(p => new Date(p.date).getDay() === 6);
    const BOM = "\uFEFF";
    const csvRows = ["Date;Prénom;Nom;Statut"]; 
    samedisOnly.forEach(p => csvRows.push(`${p.date};${p.profiles?.[0]?.prenom || ''};${p.profiles?.[0]?.nom || ''};${p.statut}`));
    const blob = new Blob([BOM + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Export_Samedis_${today}.csv`;
    link.click();
    setExporting(false);
    setShowNotif(true);
    setTimeout(() => setShowNotif(false), 3000);
  };

  return (
    <div className="min-h-screen bg-white p-6 pb-32 max-w-md mx-auto font-sans text-black">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">L'Appel</h1>
          <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mt-1">
            {showNotif ? "Export terminé !" : "Coche les présences du jour"}
          </p>
        </div>
        {isAdminOrBenevole && (
          <button onClick={handleExportPresences} disabled={exporting} className="bg-gray-50 p-3 rounded-2xl flex items-center gap-2 border border-gray-100 active:scale-95 transition-all disabled:opacity-50">
            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            <span className="text-[10px] font-black uppercase tracking-widest">Export</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-gray-200" /></div>
        ) : eleves.map((eleve) => {
          const profileId = eleve.profiles?.id;
          const status = presences[profileId]?.statut;
          return (
            <div key={eleve.id} className="bg-gray-50 rounded-[2.5rem] p-4 flex flex-col items-center border border-gray-100 shadow-sm relative">
              
              <div className="relative mb-3 group">
                <button 
                  onClick={() => handleStatutChange(eleve, "Présent")}
                  className={`w-24 h-24 rounded-[2rem] transition-all duration-300 flex items-center justify-center border-4 ${
                    status === "Présent" ? "bg-[#76D7B1] border-[#76D7B1] rotate-3" : 
                    status === "Absent" ? "bg-red-500 border-red-500 -rotate-3" : 
                    "bg-white border-gray-100"
                  }`}
                >
                  <img className="w-20 h-20 rounded-2xl opacity-90" src={`https://api.dicebear.com/7.x/${eleve.profiles?.avatar_key || 'adventurer'}/svg?seed=${eleve.profiles?.avatar_seed || eleve.profiles?.prenom}`} alt="avatar" />
                  {status === "Présent" && <Check className="absolute w-12 h-12 text-white stroke-[4px]" />}
                  {status === "Absent" && <X className="absolute w-12 h-12 text-white stroke-[4px]" />}
                </button>
              </div>

              <div className="text-center mb-4">
                <p className="text-sm font-black uppercase italic tracking-tighter">{eleve.profiles?.prenom}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Élève B2S</p>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <button 
                  onClick={() => handleStatutChange(eleve, "Absent")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                    status === "Absent" ? "bg-red-500 text-white shadow-lg shadow-red-200" : "bg-red-50 text-red-600 border border-red-100"
                  }`}
                >
                  <UserX size={14} />
                  Signaler absent
                </button>

                <button 
                  onClick={() => router.push(`/devoirs?eleveId=${eleve.id}`)} 
                  className="flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 shadow-lg shadow-black/10"
                >
                  <Book size={14} />
                  Devoirs
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}