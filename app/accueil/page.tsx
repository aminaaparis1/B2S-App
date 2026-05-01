"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import { Clock, BookOpen, ChevronRight, Info, CalendarCheck, Users } from "lucide-react";
import { format, addDays, isSaturday, startOfWeek, isToday, startOfDay } from "date-fns"; 
import { fr } from "date-fns/locale";
import { useRouter } from "next/navigation";

export default function AccueilPage() {
  const [profile, setProfile] = useState<any>(null);
  const [nextSeance, setNextSeance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const startOfOurWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const calendarDays = Array.from({ length: 6 }).map((_, i) => addDays(startOfOurWeek, i));

  useEffect(() => {
    async function fetchHomeData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("prenom, role")
        .eq("id", user.id)
        .single();
      setProfile(prof);

      const todayStart = startOfDay(new Date()).toISOString();
      const { data: seances } = await supabase
        .from("seances")
        .select("*")
        .gte("date_debut", todayStart) 
        .order("date_debut", { ascending: true }) 
        .limit(1)
        .maybeSingle();

      if (seances) setNextSeance(seances);
      setLoading(false);
    }
    fetchHomeData();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white pb-32 font-sans max-w-md mx-auto">
      
      <div className="p-8 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight uppercase italic">
            Bonjour, <br />
            {loading ? (
              <div className="h-9 w-32 bg-gray-100 animate-pulse rounded-lg mt-1"></div>
            ) : (
              <span className="text-[#76D7B1]">{profile?.prenom || "Ami"} !</span>
            )}
          </h1>
          {!loading && (
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
              Espace {profile?.role || "Utilisateur"}
            </p>
          )}
        </div>
        {isSaturday(new Date()) && (
          <div className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full animate-bounce shadow-md">
            JOUR J 🚀
          </div>
        )}
      </div>

      <div className="px-6 mt-4">
        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-[2.5rem] border border-gray-100 shadow-inner">
          {calendarDays.map((date, i) => {
            const isDaySaturday = isSaturday(date);
            const isDayToday = isToday(date);

            return (
              <div 
                key={i} 
                className={`flex flex-col items-center p-2 rounded-2xl w-11 transition-all ${
                  isDaySaturday 
                    ? 'bg-red-500 text-white shadow-lg scale-110 z-10' 
                    : isDayToday 
                      ? 'bg-[#76D7B1] text-white shadow-md' 
                      : 'text-gray-400'
                }`}
              >
                <span className="text-[9px] font-black uppercase mb-1">
                  {format(date, "eee", { locale: fr }).replace('.', '')}
                </span>
                <span className="text-base font-black">
                  {format(date, "d")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-8 mt-10">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-lg font-black text-gray-800 uppercase italic">Prochaine séance</h3>
          <span className="text-[10px] font-bold text-[#76D7B1] uppercase">Voir tout</span>
        </div>
        
        {loading ? (
          <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 h-64 animate-pulse"></div>
        ) : nextSeance ? (
          <div className="bg-[#76D7B1] p-7 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="bg-white/20 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  {nextSeance.type || "Coaching"}
                </span>
                <h4 className="text-2xl font-black mt-3 leading-tight italic uppercase">{nextSeance.titre}</h4>
              </div>
              <CalendarCheck className="w-8 h-8 opacity-40" />
            </div>

            <div className="mt-8 space-y-3 relative z-10">
              <div className="flex items-center gap-3 text-sm font-black uppercase italic">
                <Clock className="w-4 h-4 text-white" />
                <span>{format(new Date(nextSeance.date_debut), "EEEE d MMMM", { locale: fr })}</span>
              </div>
              <p className="text-sm opacity-90 italic font-medium line-clamp-2">
                {nextSeance.description}
              </p>
            </div>

            <button 
              onClick={() => router.push('/seances')}
              className="w-full mt-8 bg-white text-[#76D7B1] py-4 rounded-2xl font-black uppercase italic text-xs flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg"
            >
              Accéder à la séance
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-12 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold italic text-sm">Repos ! Aucune séance à l'horizon.</p>
          </div>
        )}
      </div>

      {!loading && profile?.role === "Benevole" && (
        <div className="px-8 mt-6">
          <button 
            onClick={() => router.push('/eleves')}
            className="w-full bg-black text-white p-5 rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[#76D7B1] p-3 rounded-2xl">
                <Users className="text-white w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-[#76D7B1] uppercase tracking-widest">Actions rapides</p>
                <p className="font-black italic uppercase text-sm">Faire l'appel aujourd'hui</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}