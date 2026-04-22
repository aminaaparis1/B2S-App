"use client";
import { useState } from "react";
import { supabase } from "../../src/lib/supabase"; 
import { useRouter } from "next/navigation";
import { RefreshCw, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString(36).substring(7));
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (authError) throw authError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non trouvé");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          must_change_password: false,
          avatar_key: "adventurer",
          avatar_seed: avatarSeed 
        })
        .eq("id", user.id);
      
      if (profileError) throw profileError;

      router.push("/accueil"); 
    } catch (err: any) {
      setError("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 font-sans">
      
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          {/* ZONE PHOTO DE PROFIL SIMPLIFIÉE */}
          <div className="relative mb-4">
            <div className="w-32 h-32 flex items-center justify-center border-4 border-[#76D7B1] rounded-full bg-gray-50 overflow-hidden shadow-sm">
               <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} 
                  alt="Ton profil"
                  className="w-full h-full object-cover"
               />
            </div>
            <button 
              type="button"
              onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
              className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <h1 className="text-2xl font-black text-black">Bienvenue !</h1>
          <p className="text-sm text-gray-400 text-center mt-1 font-medium">
            Personnalisez votre profil et choisissez votre mot de passe.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* MESSAGE RASSURANT */}
          <div className="flex items-center gap-3 bg-green-50 p-4 rounded-2xl border border-green-100 mb-2">
            <ShieldCheck className="w-8 h-8 text-[#76D7B1]" />
            <p className="text-[11px] text-green-700 font-bold leading-tight uppercase">
              Choisissez un mot de passe que vous retiendrez facilement.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl text-xs text-center font-bold bg-red-50 text-red-500 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <input 
              type="password" 
              placeholder="Nouveau mot de passe" 
              className="w-full border-2 border-gray-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-[#76D7B1] text-gray-400 " 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} 
              required
            />
            
            <input 
              type="password" 
              placeholder="Confirmer le mot de passe" 
              className="w-full border-2 border-gray-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-[#76D7B1] text-gray-400 " 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} 
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#76D7B1] text-white font-black py-5 rounded-2xl shadow-xl shadow-[#76D7B1]/30 transition-all active:scale-95 text-sm uppercase tracking-widest mt-4"
          >
            {loading ? "Enregistrement..." : "Valider mon profil"}
          </button>
        </form>
      </div>
    </div>
  );
}