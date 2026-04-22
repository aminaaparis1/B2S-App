"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { FileDown, Book, Check, X, Loader2 } from "lucide-react";
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

    const { data: benevole } = await supabase
      .from("benevoles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (benevole) {
      setIsAdminOrBenevole(true);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "Admin") setIsAdminOrBenevole(true);
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      const { data: elevesData } = await supabase
        .from("eleves")
        .select(`
          id, 
          profiles (id, prenom, nom, avatar_key, avatar_seed)
        `);

      const { data: presencesData } = await supabase
        .from("presences")
        .select()
        .eq("date", today);

      if (elevesData) setEleves(elevesData);
      
      const presenceMap: Record<string, any> = {};
      presencesData?.forEach(p => {
        presenceMap[p.user_id] = p;
      });
      setPresences(presenceMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
const handleExportPresences = async () => {
    setExporting(true);
    
    
    const { data: allPresences, error } = await supabase
      .from("presences")
      .select(`
        date,
        statut,
        profiles (prenom, nom)
      `)
      .order('date', { ascending: false });

    if (error || !allPresences) {
      console.error(error);
      alert("Erreur lors de l'export");
      setExporting(false);
      return;
    }

    // On filtre en JavaScript pour ne garder que les samedis
    // getDay() renvoie 6 pour le samedi
    const samedisOnly = allPresences.filter(p => {
      const dateObj = new Date(p.date);
      return dateObj.getDay() === 6;
    });

    if (samedisOnly.length === 0) {
      alert("Aucune donnée de présence trouvée pour les samedis.");
      setExporting(false);
      return;
    }

    const BOM = "\uFEFF";
    const csvRows = ["Date;Prénom;Nom;Statut"]; 

    samedisOnly.forEach(p => {
      const row = [
        p.date,
        p.profiles?.[0]?.prenom || '',
        p.profiles?.[0]?.nom || '',
        p.statut
      ].join(';');
      csvRows.push(row);
    });

    const csvString = BOM + csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Export_Samedis_${today}.csv`;
    link.click();

    setExporting(false);
    setShowNotif(true);
    setTimeout(() => setShowNotif(false), 3000);
  };

  const handlePointage = async (profileId: string) => {
    const current = presences[profileId];
    let nextStatut = "Présent";
    if (current?.statut === "Présent") nextStatut = "Absent";
    else if (current?.statut === "Absent") nextStatut = "delete";

    if (nextStatut === "delete") {
      await supabase.from("presences").delete().eq("id", current.id);
      const newPresences = { ...presences };
      delete newPresences[profileId];
      setPresences(newPresences);
    } else if (current) {
      const { data } = await supabase
        .from("presences")
        .update({ statut: nextStatut })
        .eq("id", current.id)
        .select().single();
      setPresences({ ...presences, [profileId]: data });
    } else {
      const { data } = await supabase
        .from("presences")
        .insert({ user_id: profileId, statut: nextStatut, date: today })
        .select().single();
      setPresences({ ...presences, [profileId]: data });
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 pb-32 max-w-md mx-auto font-sans">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-black italic uppercase tracking-tighter">L'Appel</h1>
          {showNotif ? (
            <p className="text-green-500 font-bold text-sm uppercase italic">Samedis exportés !</p>
          ) : (
            <p className="text-gray-400 font-bold text-sm">Coche les présents aujourd'hui</p>
          )}
        </div>

        {isAdminOrBenevole && (
          <button 
            onClick={handleExportPresences}
            disabled={exporting}
            className="bg-gray-100 p-3 rounded-2xl hover:bg-gray-200 active:scale-95 transition-all flex items-center gap-2 border border-gray-200 shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5 text-black" />}
            <span className="text-[10px] font-black uppercase tracking-widest text-black">Export</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-y-8 gap-x-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
          </div>
        ) : eleves.map((eleve) => {
          const profileId = eleve.profiles?.id;
          const status = presences[profileId]?.statut;
          const avatarKey = eleve.profiles?.avatar_key || 'adventurer';
          const avatarSeed = eleve.profiles?.avatar_seed || eleve.profiles?.prenom;

          return (
            <div key={eleve.id} className="flex flex-col items-center">
              <div className="relative mb-2">
                <button 
                  onClick={() => handlePointage(profileId)}
                  className={`w-20 h-20 rounded-[2rem] transition-all duration-300 flex items-center justify-center border-4 ${
                    status === "Présent" ? "bg-[#76D7B1] border-[#76D7B1] rotate-3" : 
                    status === "Absent" ? "bg-red-500 border-red-500 -rotate-3" : 
                    "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden opacity-90">
                    <img 
                      src={`https://api.dicebear.com/7.x/${avatarKey}/svg?seed=${avatarSeed}`} 
                      alt="avatar" 
                    />
                  </div>
                  {status === "Présent" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#76D7B1]/40 rounded-[1.8rem]">
                      <Check className="w-10 h-10 text-white stroke-[4px]" />
                    </div>
                  )}
                  {status === "Absent" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/40 rounded-[1.8rem]">
                      <X className="w-10 h-10 text-white stroke-[4px]" />
                    </div>
                  )}
                </button>
              </div>

              <p className="text-[10px] font-black text-black uppercase tracking-widest text-center truncate w-full mb-2 px-1">
                {eleve.profiles?.prenom}
              </p>

              <button 
                onClick={() => router.push(`/devoirs?eleveId=${eleve.id}`)}
                className="bg-black text-white px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-90 transition-all shadow-md shadow-black/10"
              >
                <Book className="w-3 h-3" />
                <span className="text-[9px] font-bold">Devoirs</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}