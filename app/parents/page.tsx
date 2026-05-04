"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useRouter } from "next/navigation";
import { Bell, X, Info } from "lucide-react";

export default function ParentsPage() {
  const [enfants, setEnfants] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Récupération des enfants
        const { data: kids } = await supabase
          .from("eleves")
          .select(`
            id,
            profiles (prenom, nom, avatar_key, avatar_seed)
          `)
          .eq("parent_id", user.id); 

        if (kids) setEnfants(kids);

        // 2. Récupération des notifications non lues
        const { data: alerts } = await supabase
          .from("notifications")
          .select("*")
          .eq("destinataire_id", user.id)
          .order('created_at', { ascending: false });

        if (alerts) setNotifs(alerts);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  // Fonction pour marquer les notifications comme lues
 const fermerNotifs = async () => {
  setIsModalOpen(false);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // 1. On dit à la base de données que c'est lu
    await supabase
      .from("notifications")
      .update({ lu: true })
      .eq("destinataire_id", user.id)
      .eq("lu", false);

    // 2. On met à jour l'affichage localement pour faire partir le badge rouge
    setNotifs(prevNotifs => 
      prevNotifs.map(n => ({ ...n, lu: true }))
    );
  }
};

  return (
    <div className="min-h-screen bg-white p-6 pb-32 max-w-md mx-auto font-sans">
      {/* HEADER AVEC CLOCHE */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-black text-black mb-2 italic uppercase tracking-tighter">
            Mes enfants
          </h1>
          <p className="text-gray-400 font-bold text-sm">Suivez le travail de vos enfants</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="relative p-3 bg-gray-50 rounded-2xl border border-gray-100 active:scale-90 transition-all"
        >
          <Bell className="w-6 h-6 text-black" />
          {notifs.filter(n => !n.lu).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-black">
              {notifs.filter(n => !n.lu).length}
            </span>
          )}
        </button>
      </div>

      {/* GRILLE DES ENFANTS */}
      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center animate-pulse">
              <div className="w-16 h-16 rounded-full bg-gray-100 mb-2" />
              <div className="h-3 w-12 bg-gray-100 rounded" />
            </div>
          ))
        ) : enfants.length > 0 ? (
          enfants.map((enfant) => {
            const avatarKey = enfant.profiles?.avatar_key || 'adventurer';
            const avatarSeed = enfant.profiles?.avatar_seed || enfant.profiles?.prenom;

            return (
              <div 
                key={enfant.id}
                onClick={() => router.push(`/devoirs?eleveId=${enfant.id}&view=parent`)}
                className="flex flex-col items-center bg-white border border-gray-100 p-3 rounded-2xl shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-2 overflow-hidden border border-gray-50">
                  <img 
                    src={`https://api.dicebear.com/7.x/${avatarKey}/svg?seed=${avatarSeed}`} 
                    alt="avatar" 
                    className="w-14 h-14 object-cover"
                  />
                </div>
                <p className="text-[10px] font-black text-gray-700 text-center truncate w-full uppercase tracking-wider">
                  {enfant.profiles?.prenom}
                </p>
              </div>
            );
          })
        ) : (
          <p className="col-span-3 text-center py-10 text-gray-400 text-sm italic font-medium">
            Aucun enfant rattaché à votre compte.
          </p>
        )}
      </div>

      {/* MODAL DES NOTIFICATIONS */}
      {isModalOpen && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-end justify-center p-4">
    <div className="bg-white w-full max-w-sm rounded-t-[40px] rounded-b-[40px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 mb-20"> 
    
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase italic">Alertes B2S</h2>
        <button onClick={fermerNotifs} className="p-2 bg-gray-100 rounded-full">
          <X size={20} />
        </button>
      </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {notifs.length > 0 ? notifs.map((n) => (
                <div key={n.id} className={`p-4 rounded-3xl border ${n.lu ? 'bg-gray-50 border-gray-100' : 'bg-blue-50 border-blue-100'}`}>
                  <div className="flex gap-3">
                    <Info className={n.lu ? 'text-gray-400' : 'text-blue-600'} size={20} />
                    <div>
                      <p className={`text-sm font-bold ${n.lu ? 'text-gray-500' : 'text-blue-900'}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] mt-1 text-gray-400 font-bold uppercase">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10">
                  <p className="text-gray-400 font-bold italic">Aucune notification</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={fermerNotifs}
              className="w-full mt-6 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}