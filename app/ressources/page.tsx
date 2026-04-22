"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { Download, Plus, FileText, Loader2, X, UploadCloud } from "lucide-react";

export default function RessourcesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [category, setCategory] = useState("General"); // Par défaut avec accent
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // États pour le formulaire d'ajout
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("General"); // Par défaut avec accent

  useEffect(() => {
    checkUserRole();
    fetchRessources();
  }, [category]);

  async function checkUserRole() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) return;

    const { data: benevole } = await supabase
      .from("benevoles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (benevole) {
      setIsAdmin(true);
    }
  }

  async function fetchRessources() {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("Ressources")
      .list(category);

    if (!error && data) {
      // FILTRE : On enlève le fichier placeholder s'il existe
      const cleanFiles = data.filter(f => f.name !== ".emptyFolderPlaceholder");
      setFiles(cleanFiles);
    }
    setLoading(false);
  }

 const handleUpload = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedFile) return;

  setUploading(true);


  const cleanName = selectedFile.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/\s+/g, "-")         
    .replace(/[^a-zA-Z0-9.-]/g, ""); 

  const filePath = `${uploadCategory}/${cleanName}`;

  const { error } = await supabase.storage
    .from("Ressources")
    .upload(filePath, selectedFile, { upsert: true });

  if (!error) {
    setIsModalOpen(false);
    setSelectedFile(null);
    if (uploadCategory === category) fetchRessources();
    else setCategory(uploadCategory);
  } else {

    alert("Erreur lors de l'envoi : " + error.message);
  }
  setUploading(false);
};
  const handleDownload = async (fileName: string) => {
    const { data } = await supabase.storage
      .from("Ressources")
      .download(`${category}/${fileName}`);
    if (data) {
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 pb-32 max-w-md mx-auto font-sans">
      <div className="text-center mb-8 pt-4">
        <h1 className="text-2xl font-black text-black italic uppercase tracking-tighter">Ressources</h1>
      </div>

      {/* Barre d'onglets + Bouton Ajouter au même niveau */}
      <div className="flex items-center justify-between mb-8 gap-2">
        <div className="flex bg-gray-100 p-1 rounded-2xl flex-grow">
          {["General", "Psychologique"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                category === cat ? "bg-white text-black shadow-sm" : "text-gray-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => {
                setUploadCategory(category); // Ouvre le modal sur la catégorie active
                setIsModalOpen(true);
            }}
            className="bg-black text-white p-3 rounded-2xl active:scale-90 transition-all shadow-lg shadow-black/20"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Liste des fichiers */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-200" /></div>
        ) : files.length > 0 ? (
          files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-4 border-2 border-gray-50 rounded-[2rem] bg-white shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-[#F0FAF6] p-2 rounded-xl">
                    <FileText className="w-5 h-5 text-[#76D7B1]" />
                </div>
                <p className="text-xs font-bold text-gray-800 truncate">{file.name}</p>
              </div>
              <button onClick={() => handleDownload(file.name)} className="text-gray-300 hover:text-black p-2 transition-colors">
                <Download className="w-5 h-5" />
              </button>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400 text-sm py-10 italic font-medium">
            Aucun document dans cette catégorie.
          </p>
        )}
      </div>

      {/* MODAL FORMULAIRE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-gray-500 font-black uppercase italic tracking-tighter">Ajouter</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-500 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Catégorie cible</label>
                <select 
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-gray-400 font-bold mt-1 outline-none focus:border-[#76D7B1] appearance-none"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  <option value="General">Général</option>
                  <option value="Psychologique">Psychologique</option>
                </select>
              </div>

              <div className="relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Fichier</label>
                <div className="mt-1 border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative group">
                    <input 
                      type="file" 
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <UploadCloud className="w-8 h-8 text-gray-300 mb-2 group-hover:text-[#76D7B1] transition-colors" />
                    <p className="text-[10px] font-bold text-gray-500 text-center px-4 break-all">
                      {selectedFile ? selectedFile.name : "Cliquez ou glissez un fichier"}
                    </p>
                </div>
              </div>

              <button 
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full bg-[#76D7B1] text-white font-black py-4 rounded-2xl shadow-xl shadow-[#76D7B1]/20 disabled:opacity-50 uppercase tracking-widest text-xs mt-4 active:scale-95 transition-transform"
              >
                {uploading ? "Envoi en cours..." : "Publier la ressource"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}