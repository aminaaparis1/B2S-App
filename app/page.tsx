"use client";
import { useState } from "react";
import { signIn } from "../src/services/authService"; 
import { useRouter } from "next/navigation"; 
import Image from "next/image"; // Si tu as le logo B2S en fichier

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{msg: string, type: 'error' | 'success' | null}>({msg: "", type: null});
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({msg: "Connexion en cours...", type: null});

    try {
      const { profile } = await signIn(email, password);
      
      if (profile.must_change_password) {
        // Redirection vers le changement de MDP (Logique Pronote)
        router.push("/change-password");
      } else {
        // Redirection vers l'accueil/profil selon la maquette
        router.push("/accueil"); 
      }
    } catch (err: any) {
      setStatus({msg: "Identifiants incorrects ou erreur serveur", type: 'error'});
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 font-sans">
      {/* Logo B2S (le cœur vert) */}
      <div className="mb-8 flex flex-col items-center text-[#76D7B1]">
        <div className="mb-6 flex justify-center">
           {/* Ici tu pourras mettre ton image de logo : <img src="/logo.png" alt="B2S Logo" /> */}
           <Image 
            src="/B2Slogo.png"  
            alt="Logo B2S"
            width={180}
            height={180}
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Connexion</h1>
        <p className="text-sm text-gray-400 text-center mt-2 px-4">
          Entrez votre email et votre mot de passe pour vous connecter.
        </p>
      </div>
      
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <input 
          type="email" 
          placeholder="email@domain.com" 
          className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:border-[#76D7B1] bg-gray-50/50" 
          onChange={(e) => setEmail(e.target.value)} 
          required
        />
        <input 
          type="password" 
          placeholder="mot de passe" 
          className="w-full border border-gray-200 rounded-xl p-3 text-gray-700 focus:outline-none focus:border-[#76D7B1] bg-gray-50/50" 
          onChange={(e) => setPassword(e.target.value)} 
          required
        />
        
        <button 
          type="submit" 
          className="w-full bg-[#76D7B1] hover:bg-[#62c49f] text-white font-semibold py-3 rounded-xl shadow-sm transition-all active:scale-95"
        >
          Se connecter
        </button>
      </form>

      {status.msg && (
        <div className={`mt-6 p-3 rounded-lg text-sm text-center ${status.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
          {status.msg}
        </div>
      )}
    </div>
  );
}