"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import { ArrowLeft, Calendar, AlignLeft, FileText, ExternalLink, MessageSquare, Save } from "lucide-react";

export default function DevoirDetails() {
  const { id } = useParams();
  const router = useRouter();
  const [devoir, setDevoir] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [canEditComment, setCanEditComment] = useState(false); 
  const [commentaire, setCommentaire] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        const role = profile?.role?.toLowerCase();
        
        setCanEditComment(role === "benevole" || role === "admin" || role === "parent");

        // Récupération globale du devoir et de ses fichiers liés
        const { data, error } = await supabase
          .from("devoirs")
          .select(`*, fichiers (*)`)
          .eq("id", id)
          .single();

        if (error) {
          console.error("❌ Erreur lors de la récupération du devoir :", error);
        }

        if (data) {
          console.log("📄 Données reçues du devoir :", data);
          setDevoir(data);
          setCommentaire(data.commentaire_benevole || "");
        }
      } catch (err) {
        console.error("❌ Crash fetchDetails :", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetails();
  }, [id]);

  const handleSaveComment = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("devoirs")
      .update({ commentaire_benevole: commentaire })
      .eq("id", id);
    
    if (!error) {
      alert("Note mise à jour !");
    }
    setIsSaving(false);
  };

  // Helper pour vérifier si le fichier est une image
  const isImage = (filename: string) => {
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);
  };

  return (
    <div className="min-h-screen bg-white p-5 max-w-md mx-auto font-sans pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-black rounded-xl active:scale-90 transition-all">
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
        </button>
        <span className="text-sm font-black uppercase tracking-widest text-gray-300">Détails</span>
      </div>

      {/* Titre et Date */}
      <div className="mb-8">
        {loading ? (
          <div className="h-8 w-3/4 bg-gray-100 animate-pulse rounded-xl mb-2" />
        ) : (
          <>
            <h1 className="text-2xl font-black text-black leading-tight mb-1">{devoir?.matiere}</h1>
            <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
              <Calendar className="w-4 h-4" />
              <span>Pour le {devoir?.date}</span>
            </div>
          </>
        )}
      </div>

      <div className="space-y-6">
        {/* Section Instructions */}
        <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
          <div className="flex items-center gap-2 mb-3 text-black/40">
            <AlignLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Instructions élève</span>
          </div>
          <p className="text-sm font-medium text-gray-700 leading-relaxed">
            {devoir?.description}
          </p>
        </div>

        {/* ZONE COMMENTAIRE (Accessible Staff + Parents) */}
        <div className="bg-[#F0FAF6] p-5 rounded-3xl border-2 border-[#76D7B1]/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[#4A8E74]">
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Observations Tuteur / Parent</span>
            </div>
            {canEditComment && (
              <button 
                onClick={handleSaveComment}
                disabled={isSaving}
                className="bg-[#76D7B1] text-white p-1.5 rounded-lg active:scale-90 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>

          {canEditComment ? (
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ajouter une note ou une observation..."
              className="w-full bg-white border-2 border-transparent focus:border-[#76D7B1] rounded-2xl p-3 text-sm font-bold text-gray-700 outline-none transition-all resize-none shadow-sm"
              rows={3}
            />
          ) : (
            <p className="text-sm font-bold text-[#4A8E74] italic">
              {devoir?.commentaire_benevole || "Aucun commentaire pour le moment."}
            </p>
          )}
        </div>

        {/* Section Fichier Corrigée */}
        {!loading && devoir?.fichiers && devoir.fichiers.length > 0 && (
          <div className="mt-4">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-2 block">
              Pièce jointe ({devoir.fichiers.length})
            </label>
            
            <div className="space-y-3">
              {devoir.fichiers.map((fichier: any) => (
                <div key={fichier.id} className="bg-gray-50 rounded-3xl border-2 border-gray-100 p-4">
                  {/* Si c'est une image, on affiche un aperçu miniature */}
                  {isImage(fichier.nom_fichier) && (
                    <div className="mb-3 overflow-hidden rounded-2xl border bg-white max-h-48 flex items-center justify-center">
                      <img 
                        src={fichier.url_storage} 
                        alt={fichier.nom_fichier} 
                        className="w-full h-full object-contain max-h-47"
                      />
                    </div>
                  )}

                  <a 
                    href={fichier.url_storage} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden w-4/5">
                      <div className="bg-gray-100 p-2 rounded-xl text-gray-500 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-gray-700 truncate">
                        {fichier.nom_fichier}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mr-1" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}