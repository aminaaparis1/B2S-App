"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { searchContext } from '../../src/services/ai/search';
import { NIVEAUX_MATIERES_CHAPITRES } from './data';
import { 
  Loader2, Sparkles, CheckCircle2, XCircle, Award, ArrowLeft,
  ChevronDown, Book, Calculator, Compass, HeartPulse, Atom, BarChart3, Binary
} from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: string[];
  reponseCorrecte: string;
  explication: string;
}

interface Quiz {
  titre: string;
  questions: Question[];
}

// Dictionnaire d'icônes complet et synchronisé avec toutes les matières du collège au lycée
const MATIERES_ICONS: { [key: string]: any } = {
  "Mathématiques": Calculator,
  "Français": Book,
  "Histoire-Géographie": Compass,
  "Sciences de la Vie et de la Terre": HeartPulse,
  "Physique-Chimie": Atom,
  "Sciences Économiques et Sociales": BarChart3,
  "Sciences Numériques et Technologie": Binary,
  "Sciences et Technologie": Atom,
  "Technologie": Binary,
  "Anglais (LV1/LV2)": Book,
  "Anglais (LV1)": Book,
  "Espagnol (LV1/LV2)": Book,
  "Allemand (LV1/LV2)": Book
};

export default function ExercicesPage() {
  const [niveau, setNiveau] = useState("Seconde");
  const [matiere, setMatiere] = useState("Mathématiques");
  const [chapitre, setChapitre] = useState("");

  // États de contrôle pour l'ouverture des menus
  const [openMatiere, setOpenMatiere] = useState(false);
  const [openChapitre, setOpenChapitre] = useState(false);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [reponsesSelectionnees, setReponsesSelectionnees] = useState<{ [key: number]: string }>({});
  const [validationRendue, setValidationRendue] = useState(false);
  const [noteFinal, setNoteFinale] = useState<number | null>(null);

  const listesMatieresDisponibles = Object.keys(NIVEAUX_MATIERES_CHAPITRES[niveau] || {});
  const listeChapitresDisponibles = NIVEAUX_MATIERES_CHAPITRES[niveau]?.[matiere] || [];

  // Effet 1 : Sécurise la matière sélectionnée si le niveau change
  // Effet 1 : ajuste la matière quand le niveau change
useEffect(() => {
  const disponibles = Object.keys(
    NIVEAUX_MATIERES_CHAPITRES[niveau] || {}
  );

  if (disponibles.length === 0) return;

  if (!disponibles.includes(matiere)) {
    setMatiere(disponibles[0]); 
  }
}, [niveau]); 


// Effet 2 : ajuste le chapitre quand niveau ou matière change
useEffect(() => {
  const chapitresDisponibles =
    NIVEAUX_MATIERES_CHAPITRES[niveau]?.[matiere] || [];

  if (chapitresDisponibles.length === 0) {
    setChapitre("");
    return;
  }

  if (!chapitresDisponibles.includes(chapitre)) {
    setChapitre(chapitresDisponibles[0]); 
  }
}, [niveau, matiere]); 

  const handleGenerate = async () => {
    if (!chapitre) return alert("Sélectionne un chapitre valide !");

    setLoading(true);
    setQuiz(null);
    setReponsesSelectionnees({});
    setValidationRendue(false);
    setNoteFinale(null);

    setOpenMatiere(false);
    setOpenChapitre(false);

    try {
      let matiereNettoyee = matiere;
      if (matiere.includes("Histoire")) matiereNettoyee = "Histoire-Géographie";
      if (matiere.includes("SVT") || matiere.includes("Vie")) matiereNettoyee = "Sciences de la Vie et de la Terre";
      if (matiere.includes("Physique")) matiereNettoyee = "Physique-Chimie";
      if (matiere.includes("Économiques") || matiere.includes("SES")) matiereNettoyee = "Sciences Économiques et Sociales";
      if (matiere.includes("Numériques") || matiere.includes("SNT")) matiereNettoyee = "Sciences Numériques et Technologie";

      const searchTerms = `cours notions exercices formules definitions calculs ${chapitre} ${matiereNettoyee} ${niveau}`;
      const contextDocs = await searchContext(searchTerms, 6, matiereNettoyee);
      
      const contextText = contextDocs.length > 0 
        ? contextDocs.map((d: any) => d.content).join("\n---\n")
        : `Cours complet et exercices pratiques d'application sur le thème : ${chapitre}, niveau classe de ${niveau}.`;

      const res = await fetch('/api/generate-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matiere: matiereNettoyee, niveau, chapitre, context: contextText })
      });

      const data = await res.json();
      setQuiz(data?.quiz ? data.quiz : data);
    } catch (err) {
      console.error(err);
      alert("Échec lors de la génération de l'exercice.");
    } finally {
      setLoading(false);
    }
  };

  const handleCorrection = () => {
    if (!quiz?.questions) return;
    let totalCorrects = 0;
    quiz.questions.forEach((q) => {
      if (reponsesSelectionnees[q.id] === q.reponseCorrecte) {
        totalCorrects++;
      }
    });
    const noteCalcul = Math.round((totalCorrects / quiz.questions.length) * 20);
    setNoteFinale(noteCalcul);
    setValidationRendue(true);
  };

  const CurrentMatiereIcon = MATIERES_ICONS[matiere] || Book;

  // Détection linguistique pour adapter les libellés statiques de l'interface
  const isEnglish = matiere.toLowerCase().includes("anglais");
  const isSpanish = matiere.toLowerCase().includes("espagnol");
  const isGerman = matiere.toLowerCase().includes("allemand");

  const getButtonLabel = () => {
    if (validationRendue) return isEnglish ? "New Training" : isSpanish ? "Nuevo entrenamiento" : isGerman ? "Neues Training" : "Nouvel entraînement";
    return isEnglish ? "Calculate Score & Correct" : isSpanish ? "Calcular nota y corregir" : isGerman ? "Note berechnen & korrigieren" : "Calculer ma note et corriger";
  };

  const getExplanationHeader = () => {
    return isEnglish ? "Pedagogical Explanation:" : isSpanish ? "Explicación pedagógica:" : isGerman ? "Pädagogische Erklärung:" : "Explication pédagogique :";
  };

  const getDashboardStatus = () => {
    return isEnglish ? "Evaluation verified!" : isSpanish ? "¡Evaluación verificada!" : isGerman ? "Bewertung überprüft!" : "Évaluation corrigée !";
  };

  return (
    <div className="min-h-screen bg-white p-6 pb-24 max-w-md mx-auto font-sans text-black flex flex-col">
      
      {/* BOUTON RETOUR HUB AVEC TRADUCTION CONTEXTUELLE */}
      <Link 
        href="/assistant" 
        className="inline-flex items-center gap-2 text-gray-400 hover:text-black font-black text-[10px] uppercase tracking-widest mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> {isEnglish ? "Back" : isSpanish ? "Volver" : isGerman ? "Zurück" : "Retour"}
      </Link>

      {/* HEADER AVEC TRADUCTION CONTEXTUELLE */}
      <header className="mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
          {isEnglish ? "Generator" : isSpanish ? "Generador" : isGerman ? "Generator" : "Générateur"}
        </h1>
        <p className="text-[#76D7B1] font-black text-[10px] uppercase tracking-widest mt-1 flex items-center gap-1">
          <Sparkles size={10} /> {isEnglish ? "Automatic Evaluation B2S" : isSpanish ? "Evaluación Automática B2S" : isGerman ? "Automatische Auswertung B2S" : "Évaluation Automatique B2S"}
        </p>
      </header>

      {/* CONFIGURATEUR DE FILTRES INTERACTIFS */}
      {!quiz && !loading && (
        <div className="space-y-5 animate-fade-in">
          
          {/* 1. SELECTION DU NIVEAU (CHIPS STYLE) */}
          <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-3">1. Choix du Niveau</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(NIVEAUX_MATIERES_CHAPITRES).map((n) => {
                const isSelected = niveau === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setNiveau(n); setOpenMatiere(false); setOpenChapitre(false); }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                      isSelected 
                        ? 'bg-[#C2F3E1] text-black border-2 border-[#76D7B1]' 
                        : 'bg-white text-gray-500 border border-gray-200/60 hover:border-gray-300'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SÉLECTEUR DE MATIÈRE CUSTOMISÉ AVEC ICÔNE MODULAIRE */}
          <div className="relative">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2 px-1">2. Matière d'étude</label>
            <button
              type="button"
              onClick={() => { setOpenMatiere(!openMatiere); setOpenChapitre(false); }}
              className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between text-xs font-bold text-black shadow-sm transition-all active:scale-[0.99] hover:bg-gray-50/80"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[#C2F3E1] p-2 rounded-xl text-black">
                  <CurrentMatiereIcon size={16} />
                </div>
                <span>{matiere}</span>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${openMatiere ? 'rotate-180' : ''}`} />
            </button>

            {openMatiere && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto space-y-1">
                {listesMatieresDisponibles.map((m) => {
                  const Icon = MATIERES_ICONS[m] || Book;
                  const isSelected = matiere === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMatiere(m); setOpenMatiere(false); }}
                      className={`w-full text-left p-3 rounded-xl text-xs font-bold flex items-center gap-3 transition-colors ${
                        isSelected ? 'bg-[#C2F3E1]/50 text-black font-black' : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <Icon size={14} className={isSelected ? 'text-black' : 'text-gray-400'} />
                      <span>{m}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. SÉLECTEUR DE CHAPITRE CUSTOMISÉ */}
          <div className="relative">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2 px-1">3. Chapitre à évaluer</label>
            <button
              type="button"
              disabled={listeChapitresDisponibles.length === 0}
              onClick={() => { setOpenChapitre(!openChapitre); setOpenMatiere(false); }}
              className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between text-xs font-bold text-black shadow-sm disabled:opacity-50"
            >
              <span className="truncate max-w-[280px] text-left">{chapitre || "Aucun chapitre disponible"}</span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${openChapitre ? 'rotate-180' : ''}`} />
            </button>

            {openChapitre && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 max-h-64 overflow-y-auto space-y-1">
                {listeChapitresDisponibles.map((ch) => {
                  const isSelected = chapitre === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => { setChapitre(ch); setOpenChapitre(false); }}
                      className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-colors block truncate ${
                        isSelected ? 'bg-[#C2F3E1]/50 text-black font-black' : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CRÉATION DE L'EXERCICE */}
          <button
            onClick={handleGenerate}
            disabled={!chapitre}
            className="w-full bg-black text-white p-5 rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all shadow-md mt-4 flex items-center justify-center gap-2"
          >
            <Sparkles size={14} className="text-[#76D7B1] fill-current" />
            {isEnglish ? "Create Exercise (10 questions)" : isSpanish ? "Crear ejercicio (10 preguntas)" : isGerman ? "Übung erstellen (10 Fragen)" : "Créer l'exercice (10 questions)"}
          </button>
        </div>
      )}

      {/* ZONE DE CHARGEMENT MULTILINGUE */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 my-auto">
          <Loader2 className="w-8 h-8 animate-spin text-[#76D7B1] mb-4" />
          <p className="text-[10px] font-black uppercase text-gray-400 text-center tracking-widest max-w-[200px] mx-auto leading-relaxed">
            {isEnglish ? "Generating 10 practical questions..." : isSpanish ? "Generando 10 preguntas prácticas..." : isGerman ? "Generierung von 10 praktischen Fragen..." : "Génération des 10 questions d'application..."}
          </p>
        </div>
      )}

      {/* AFFICHAGE DU QCM CORE */}
      {quiz && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-[#C2F3E1] p-5 rounded-2xl border border-[#76D7B1]/30">
            <h2 className="text-sm font-black uppercase tracking-tight text-black">🎯 {quiz.titre || chapitre}</h2>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mt-1">{niveau} • {matiere}</p>
          </div>

          {/* BOARD DE NOTATION */}
          {noteFinal !== null && (
            <div className="bg-black text-white p-6 rounded-[2rem] flex items-center justify-between border-2 border-black shadow-lg">
              <div className="flex items-center gap-3">
                <div className="bg-[#C2F3E1] p-3 rounded-2xl text-black">
                  <Award size={24} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                    {isEnglish ? "Student Score" : isSpanish ? "Nota del alumno" : isGerman ? "Schülerbewertung" : "Résultat de l'élève"}
                  </p>
                  <p className="text-xs font-bold text-white mt-0.5">{getDashboardStatus()}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black italic tracking-tighter">{noteFinal}</span>
                <span className="text-xs font-bold text-[#76D7B1]"> /20</span>
              </div>
            </div>
          )}

          {/* MAPPING DES QUESTIONS */}
          {quiz?.questions?.map((q) => (
            <div key={q.id} className="bg-gray-50 p-5 rounded-3xl border border-gray-100 space-y-4">
              <p className="text-xs font-bold leading-relaxed">{q.id}. {q.question}</p>

              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = reponsesSelectionnees[q.id] === opt;
                  const correct = q.reponseCorrecte === opt;

                  let style = "bg-white border-gray-100 text-black";
                  if (selected) style = "bg-black text-white border-black";

                  if (validationRendue) {
                    if (correct) style = "bg-green-100 text-green-800 border-green-300 font-bold";
                    else if (selected) style = "bg-red-100 text-red-800 border-red-300 line-through";
                  }

                  return (
                    <button
                      key={opt}
                      disabled={validationRendue}
                      onClick={() => setReponsesSelectionnees(p => ({ ...p, [q.id]: opt }))}
                      className={`w-full p-4 rounded-xl text-xs border text-left transition-all flex justify-between items-center ${style}`}
                    >
                      <span>{opt}</span>
                      {validationRendue && correct && <CheckCircle2 size={14} className="text-green-600" />}
                      {validationRendue && selected && !correct && <XCircle size={14} className="text-red-600" />}
                    </button>
                  );
                })}
              </div>

              {/* SECTION DES CORRIGES / EXPLICATIONS */}
              {validationRendue && q.explication && (
                <div className="mt-3 p-4 bg-white rounded-xl border border-gray-200/60 text-[11px] text-gray-600 leading-relaxed shadow-inner">
                  <span className="font-black text-black uppercase text-[9px] tracking-wider block mb-1">{getExplanationHeader()}</span>
                  {q.explication}
                </div>
              )}
            </div>
          ))}

          {/* SOUUMISSION INTERACTIVE */}
          <div className="pt-2">
            <button
              onClick={!validationRendue ? handleCorrection : () => setQuiz(null)}
              disabled={!validationRendue && Object.keys(reponsesSelectionnees).length !== (quiz?.questions?.length || 0)}
              className="w-full bg-black text-white p-5 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-30 shadow-md"
            >
              {getButtonLabel()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}