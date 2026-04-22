"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";
import { ArrowLeft, Calendar, AlignLeft, FileText, Download, MessageSquare, Save } from "lucide-react";

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
        
  
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
        const role = profile?.role?.toLowerCase();
        
        setCanEditComment(role === "benevole" || role === "admin" || role === "parent");


        const { data, error } = await supabase
          .from("devoirs")
          .select(`*, fichiers (*)`)
          .eq("id", id)
          .single();

        if (data) {
          setDevoir(data);
          setCommentaire(data.commentaire_benevole || "");
        }
      } catch (err) {
        console.error(err);
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

        {/* Section Fichier */}
        {!loading && devoir?.fichiers?.length > 0 && (
          <div className="mt-4">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-2 block">Pièce jointe</label>
            <a href={devoir.fichiers[0].url_storage} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-gray-400 p-2 rounded-xl"><FileText className="w-4 h-4" /></div>
                <p className="text-[12px] font-black text-gray-400 ml-2 mb-2 block">{devoir.fichiers[0].nom_fichier}</p>
              </div>
              <Download className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-2 block" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}