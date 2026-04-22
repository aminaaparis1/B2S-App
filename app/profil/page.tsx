"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase"; 
import { User, GraduationCap, BookOpen, Users, LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation"; 

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/"); 
  };

  // --- FONCTION AJOUTÉE : Changement d'avatar ---
  const handleRefreshAvatar = async () => {
    const newSeed = Math.random().toString(36).substring(7);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_seed: newSeed, avatar_key: "adventurer" })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, avatar_seed: newSeed });
    }
  };

  useEffect(() => {
    async function fetchFullProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setProfile(profileData);

      if (profileData?.role === 'Parent') {
        const { data: childrenData } = await supabase
          .from("eleves")
          .select(`id, niveau_scolaire, profiles (prenom, avatar_seed, avatar_key)`)
          .eq("parent_id", user.id);
        if (childrenData) setChildren(childrenData);
      } 
      else if (profileData?.role === 'Elève') {
        const { data: dataEleve } = await supabase
          .from("eleves")
          .select("*")
          .eq("id", user.id)
          .single();
        if (dataEleve) setStudentData(dataEleve);
      }

      setLoading(false);
    }
    fetchFullProfile();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-white pb-32 font-sans max-w-md mx-auto">
      
      <div className="pt-10 pb-4 text-center relative">
        <h1 className="text-xl font-bold text-gray-800">Mon Profil</h1>
      </div>

      {/* Header Profil */}
      <div className="flex flex-col items-center mt-6">
        {/* On ajoute un bouton autour de l'avatar ou une icône à côté */}
        <div className="relative group">
          <div className="w-32 h-32 bg-[#C2F3E1] rounded-full flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
              {!loading ? (
                <img 
                  src={`https://api.dicebear.com/7.x/${profile?.avatar_key || 'adventurer'}/svg?seed=${profile?.avatar_seed || profile?.prenom}`} 
                  alt="avatar" 
                />
              ) : (
                <div className="w-full h-full bg-gray-100 animate-pulse" />
              )}
          </div>
          
          {/* PETIT BOUTON REFRESH AJOUTÉ ICI */}
          {!loading && (
            <button 
              onClick={handleRefreshAvatar}
              className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full shadow-lg active:scale-90 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex flex-col items-center mt-4">
          {loading ? (
            <>
              <div className="h-7 w-48 bg-gray-100 animate-pulse rounded-lg mb-2" />
              <div className="h-5 w-20 bg-gray-50 animate-pulse rounded-full" />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">
                {profile?.prenom} {profile?.nom}
              </h2>
              <span className="text-[#76D7B1] font-bold px-4 py-1 bg-[#F0FAF6] rounded-full text-xs mt-1 uppercase tracking-widest">
                {profile?.role}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-grow">
          {loading ? (
            <div className="mt-12 px-8">
               <div className="h-6 w-32 bg-gray-100 animate-pulse rounded-md mb-6" />
               <div className="h-24 w-full bg-gray-50 animate-pulse rounded-[2.5rem]" />
            </div>
          ) : (
            <>
              {profile?.role === 'Parent' && (
                <div className="mt-12 px-8">
                  <h3 className="text-lg font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                    <Users className="text-[#76D7B1] w-6 h-6" />
                    Enfant(s)
                  </h3>
                  <div className="grid grid-cols-2 gap-5">
                    {children.map((enfant) => (
                      <div key={enfant.id} className="bg-white border border-gray-100 p-5 rounded-[2.5rem] shadow-sm flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full mb-3 bg-gray-50 overflow-hidden border border-gray-100">
                          <img 
                            src={`https://api.dicebear.com/7.x/${enfant.profiles?.avatar_key || 'adventurer'}/svg?seed=${enfant.profiles?.avatar_seed || enfant.profiles?.prenom}`} 
                            alt="avatar" 
                          />
                        </div>
                        <p className="font-bold text-gray-800">{enfant.profiles?.prenom}</p>
                        <p className="text-[10px] text-[#76D7B1] font-black uppercase mt-1 px-3 py-0.5 bg-[#F0FAF6] rounded-full">
                          {enfant.niveau_scolaire}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile?.role === 'Elève' && (
                <div className="mt-12 px-8">
                  <h3 className="text-lg font-extrabold text-gray-800 mb-6 flex items-center gap-2">
                    <GraduationCap className="text-[#76D7B1] w-6 h-6" />
                    Ma scolarité
                  </h3>
                  <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                     <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Niveau actuel</span>
                        <span className="font-black text-[#76D7B1] uppercase">{studentData?.niveau_scolaire || "Non défini"}</span>
                     </div>
                  </div>
                </div>
              )}
            </>
          )}
      </div>

      <div className="px-8 mt-12">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-colors border border-red-100"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>
        <p className="text-center text-gray-300 text-[10px] mt-4 uppercase tracking-widest font-medium">
          B2S App • Version 1.0
        </p>
      </div>
    </div>
  );
}