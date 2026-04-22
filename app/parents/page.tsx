"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";

export default function ParentsPage() {
  const [enfants, setEnfants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchEnfants() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from("eleves")
          .select(`
            id,
            profiles (prenom, nom, avatar_key, avatar_seed)
          `)
          .eq("parent_id", user.id); 

        if (data) setEnfants(data);
      }
      setLoading(false);
    }
    fetchEnfants();
  }, []);

  return (
    <div className="min-h-screen bg-white p-6 pb-32 max-w-md mx-auto font-sans">
      <h1 className="text-3xl font-black text-black mb-2 italic uppercase tracking-tighter">Mes enfants</h1>
      <p className="text-gray-400 font-bold text-sm mb-8">Suivez le travail de vos enfants</p>

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
            // RÉCUPÉRATION DES DONNÉES D'AVATAR
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
                    // UTILISATION DE L'AVATAR PERSONNALISÉ
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
    </div>
  );
}