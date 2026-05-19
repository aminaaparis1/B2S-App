"use server";
import fs from 'fs';
import path from 'path';
// @ts-ignore
const pdf = require('pdf-parse-fork');
import { supabase } from '../../lib/supabase';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Découpage du texte en segments (chunks) avec zone de chevauchement (overlap) pour préserver le contexte inter-chunk
const createChunks = (text: string, chunkSize: number = 1500, overlap: number = 150) => {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
};

// Vectorisation via HuggingFace Inference API (même modèle, sans dépendance native)
const generateEmbedding = async (text: string): Promise<number[]> => {
  const result = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: text,
  });

  return Array.isArray(result[0])
    ? (result as number[][])[0]
    : (result as number[]);
};

// 💡 ALGORITHME DE SCORING SÉMANTIQUE
const attribuerNiveauStrict = (chunkText: string, fileName: string): { valide: boolean; niveau: string } => {
  const text = chunkText.toLowerCase();
  const name = fileName.toLowerCase();

  if (name.includes("seconde") || name.includes("_2de") || text.includes("classe de seconde")) {
    return { valide: true, niveau: "Seconde" };
  }

  if (name.includes("6e") || name.includes("cycle3") || name.includes("cycle-3")) {
    if ((text.includes("au cm1") || text.includes("au cm2") || text.includes("fin du cm2")) && !text.includes("en 6e") && !text.includes("sixième")) {
      return { valide: false, niveau: "" };
    }
    return { valide: true, niveau: "6ème" };
  }

  let score5e = 0;
  let score4e = 0;
  let score3e = 0;

  if (text.includes("cinquième") || text.includes("5ème") || text.includes("5e ")) score5e += 4;
  if (text.includes("classe de 5") || text.includes("fin de 5")) score5e += 2;

  if (text.includes("quatrième") || text.includes("4ème") || text.includes("4e ")) score4e += 4;
  if (text.includes("classe de 4") || text.includes("fin de 4")) score4e += 2;

  if (text.includes("troisième") || text.includes("3ème") || text.includes("3e ")) score3e += 4;
  if (text.includes("classe de 3") || text.includes("brevet") || text.includes("dnb") || text.includes("fin de 3")) score3e += 2;

  if (score5e > score4e && score5e > score3e) return { valide: true, niveau: "5ème" };
  if (score4e > score5e && score4e > score3e) return { valide: true, niveau: "4ème" };
  if (score3e > score5e && score3e > score4e) return { valide: true, niveau: "3ème" };

  if (name.includes("3eme") || name.includes("3e")) return { valide: true, niveau: "3ème" };
  if (name.includes("4eme") || name.includes("4e")) return { valide: true, niveau: "4ème" };
  if (name.includes("5eme") || name.includes("5e")) return { valide: true, niveau: "5ème" };

  return { valide: true, niveau: "Général" };
};

// 💡 CLOISONNEMENT INTERDISCIPLINAIRE
const pageConcerneMatiere = (pageText: string, matiere: string): boolean => {
  const text = pageText.toLowerCase();
  
  switch (matiere) {
    case "Mathématiques":
      if (text.includes("histoire de la terre") || text.includes("matière, movement, énergie")) return false;
      return text.includes("math") || text.includes("nombre") || text.includes("géométrie") || text.includes("calcul");
    case "Français":
      return text.includes("français") && (text.includes("lecture") || text.includes("écriture") || text.includes("littéraire") || text.includes("oral"));
    case "Histoire-Géographie":
      if (text.includes("sciences économiques") || text.includes("sociologie") || text.includes("équation")) return false; 
      return text.includes("histoire") || text.includes("géographie") || text.includes("recul historique");
    case "Sciences de la Vie et de la Terre":
      if (text.includes("physique-chimie") || text.includes("atomes")) return false;
      return text.includes("sciences de la vie") || text.includes("svt") || text.includes("vivant") || text.includes("cellule");
    case "Physique-Chimie":
      if (text.includes("cellule biologique") || text.includes("reproduction humaine")) return false;
      return text.includes("physique") || text.includes("chimie") || text.includes("molécule") || text.includes("transformation");
    case "Sciences Économiques et Sociales":
      if (text.includes("repères géographiques") || text.includes("climatologie")) return false;
      return text.includes("ses") || text.includes("socialisation") || text.includes("richesse") || text.includes("entreprise");
    case "Sciences Numériques et Technologie":
      return text.includes("snt") || text.includes("numériques") || text.includes("données") || text.includes("python");
    case "Anglais (LV1/LV2)":
      return text.includes("anglais") || text.includes("english") || text.includes("cecrl");
    case "Espagnol (LV1/LV2)":
      return text.includes("espagnol") || text.includes("spanish") || text.includes("hispan");
    case "Allemand (LV1/LV2)":
      return text.includes("allemand") || text.includes("deutsch") || text.includes("german");
    default:
      return true;
  }
};

// Orchestration du pipeline
export const ingestFolder = async (folderPath: string, matiere: string) => {
  console.log(`🚀 INGESTION SÉLECTIVE ET TRUNCATE-SAFE POUR : ${matiere}`);
  
  const absolutePath = path.resolve(process.cwd(), folderPath);
  if (!fs.existsSync(absolutePath)) {
    console.log("❌ Dossier introuvable:", absolutePath);
    return;
  }

  const files = fs.readdirSync(absolutePath);

  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const filePath = path.join(absolutePath, file);
      const dataBuffer = fs.readFileSync(filePath);
      
      const data = await pdf(dataBuffer, {
        pagerender: function(pageData: any) {
          return pageData.getTextContent().then(function(textContent: any) {
            return textContent.items.map((item: any) => item.str).join(' ') + " [PAGE_BREAK] ";
          });
        }
      });
      
      const pages = data.text.split(" [PAGE_BREAK] ");
      let totalChunksEnvoyes = 0;

      for (let i = 0; i < pages.length; i++) {
        const rawPageText = pages[i];

        if (!pageConcerneMatiere(rawPageText, matiere)) continue;

        const cleanPageText = rawPageText.replace(/\s+/g, ' ').trim();
        if (!cleanPageText) continue;

        const chunks = createChunks(cleanPageText);

        for (const chunk of chunks) {
          const analyseNiveau = attribuerNiveauStrict(chunk, file);
          if (!analyseNiveau.valide) continue;

          // ⚠️ Petite pause pour éviter le rate limit HuggingFace sur le tier gratuit
          await new Promise(resolve => setTimeout(resolve, 100));

          const embedding = await generateEmbedding(chunk);
          
          const { error } = await supabase.from('documents_pedagogiques').insert({
            content: chunk,
            embedding: embedding,
            matiere: matiere,
            niveau: analyseNiveau.niveau
          });

          if (error) {
            console.error(`❌ Erreur d'insertion pour le fichier ${file}:`, error.message);
          } else {
            totalChunksEnvoyes++;
          }
        }
      }
      console.log(`✅ Fichier ${file} synchronisé avec succès : ${totalChunksEnvoyes} morceaux individualisés.`);
    }
  }
};