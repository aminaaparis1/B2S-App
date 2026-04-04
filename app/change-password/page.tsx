"use client";
import { useState } from "react";

import { supabase } from "../../src/lib/supabase"; 
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        .update({ must_change_password: false })
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
    
      <div className="mb-8 flex flex-col items-center text-[#76D7B1]">
        <div className="w-24 h-24 mb-4 flex items-center justify-center border-4 border-[#76D7B1] rounded-full">
           <span className="text-5xl">🔐</span> 
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Nouveau Mot de Passe</h1>
        <p className="text-sm text-gray-400 text-center mt-3 px-6 leading-relaxed">
          C'est votre première connexion. Pour sécuriser votre compte, veuillez choisir un nouveau mot de passe.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        
        {error && (
          <div className="p-3 rounded-xl text-sm text-center bg-red-50 text-red-500 border border-red-200">
            {error}
          </div>
        )}

        <input 
          type="password" 
          placeholder="Nouveau mot de passe (min 6 chars)" 
          className="w-full border border-gray-200 rounded-xl p-4 text-gray-700 focus:outline-none focus:border-[#76D7B1] focus:ring-1 focus:ring-[#76D7B1] bg-gray-50/50" 
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)} 
          required
          minLength={6}
        />
        
        <input 
          type="password" 
          placeholder="Confirmer le nouveau mot de passe" 
          className="w-full border border-gray-200 rounded-xl p-4 text-gray-700 focus:outline-none focus:border-[#76D7B1] focus:ring-1 focus:ring-[#76D7B1] bg-gray-50/50" 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required
        />
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#76D7B1] hover:bg-[#62c49f] disabled:bg-gray-300 text-white font-semibold py-4 rounded-xl shadow-sm transition-all active:scale-95 mt-4"
        >
          {loading ? "Mise à jour en cours..." : "Enregistrer et Continuer"}
        </button>
      </form>
    </div>
  );
}