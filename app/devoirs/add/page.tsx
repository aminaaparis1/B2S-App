"use client";
import { useState, Suspense } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Upload, Check, Loader2 } from "lucide-react";

function AddDevoirForm() {
  const [matiere, setMatiere] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // On récupère l'éventuel ID d'élève passé par le parent
  const eleveIdParam = searchParams.get("eleveId");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      return;
    }

    // LOGIQUE CIBLE : Si un ID est dans l'URL (parent), on l'utilise. 
    // Sinon, c'est l'ID de l'user connecté (élève).
    const targetEleveId = eleveIdParam || user.id;

   
    const { data: newDevoir, error: devoirError } = await supabase
      .from("devoirs")
      .insert({
        titre: matiere, 
        matiere,
        description,
        date,
        eleve_id: targetEleveId, 
        statut: 'a_faire'
      })
      .select()
      .single();

    if (devoirError) {
      console.error("Erreur insertion:", JSON.stringify(devoirError));
      setIsSubmitting(false);
      return;
    }


    if (file && newDevoir) {
   
      const fileName = `${targetEleveId}/${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("Devoirs")
        .upload(fileName, file);

      if (!storageError) {
        const { data: urlData } = supabase.storage.from("Devoirs").getPublicUrl(fileName);
        
        await supabase.from("fichiers").insert({
          nom_fichier: file.name,
          url_storage: urlData.publicUrl,
          devoir_id: newDevoir.id,
          uploader_id: user.id // L'ID de celui qui upload (le parent ou l'élève)
        });
      }
    }


    router.back();
    setTimeout(() => router.refresh(), 100);
  };

  return (
    <div className="min-h-screen bg-white p-6 max-w-md mx-auto font-sans flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pt-2">
        <button 
          onClick={() => router.back()} 
          className="p-2.5 bg-black rounded-2xl shadow-lg active:scale-90 transition-all disabled:opacity-50"
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-6 h-6 text-white" strokeWidth={3} />
        </button>
        <h1 className="text-2xl font-black text-black tracking-tight">
            {eleveIdParam ? "Ajouter pour l'enfant" : "Nouveau devoir"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-5 flex-1">
          {/* Bloc Date */}
          <div className="bg-gray-50 p-4 rounded-3xl border-2 border-gray-100">
            <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1 mb-2 block">Date d'échéance</label>
            <input
              type="date"
              className="w-full bg-white border-2 border-gray-200 p-2 rounded-2xl text-black font-black text-lg focus:border-black outline-none transition-all"
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Bloc Matière */}
          <div className="bg-gray-50 p-4 rounded-3xl border-2 border-gray-100">
            <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1 mb-2 block">Matière</label>
            <input
              type="text"
              placeholder="ex: Français, Histoire..."
              className="w-full bg-white border-2 border-gray-200 p-2 rounded-2xl text-black font-black placeholder:text-gray-300 outline-none focus:border-black transition-all"
              onChange={(e) => setMatiere(e.target.value)}
              required
            />
          </div>

          {/* Bloc Description */}
          <div className="bg-gray-50 p-4 rounded-3xl border-2 border-gray-100">
            <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1 mb-2 block">Description</label>
            <textarea
              placeholder="Écris ce qu'il y a à faire..."
              rows={3}
              className="w-full bg-white border-2 border-gray-200 p-2.5 rounded-2xl text-black font-bold placeholder:text-gray-300 outline-none focus:border-black transition-all resize-none"
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Bloc Fichier */}
          <div className="bg-gray-50 p-4 rounded-3xl border-2 border-gray-100">
            <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1 mb-2 block">Pièce Jointe</label>
            <label className={`flex items-center justify-center gap-3 w-full p-4 rounded-2xl border-2 border-dashed font-black transition-all cursor-pointer ${file ? 'border-[#76D7B1] bg-[#F0FAF6] text-[#4A8E74]' : 'border-gray-300 bg-white text-gray-500'}`}>
               {file ? <Check className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
               <span className="text-sm truncate max-w-[200px]">{file ? file.name : "Prendre en photo / PDF"}</span>
               <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
            </label>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-[#76D7B1] text-white font-black py-3 rounded-[2rem] text-xl shadow-xl shadow-[#76D7B1]/30 mt-8 mb-4 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Ajouter le devoir"
          )}
        </button>
      </form>
    </div>
  );
}


export default function AddDevoirPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center font-bold text-[#76D7B1]">Chargement...</div>}>
      <AddDevoirForm />
    </Suspense>
  );
}