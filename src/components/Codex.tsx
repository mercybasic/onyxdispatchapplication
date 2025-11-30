import React from 'react';
import { Activity, AlertCircle, Bandage, BookOpen, ShieldPlus, Syringe } from 'lucide-react';

interface CodexEntry {
  name: string;
  compound: string;
  purpose: string;
  effect: string;
  idealUse: string;
  caution: string;
  icon: React.ReactNode;
  color: string;
}

const ENTRIES: CodexEntry[] = [
  {
    name: 'AdrenaPen',
    compound: 'Demexatrine',
    purpose: 'Restores stamina and reduces exhaustion during prolonged engagements.',
    effect: 'Boosts endurance and recovery, helping you push through sprints, climbs, or sustained combat.',
    idealUse: 'Use when fatigue is impacting movement speed or weapon sway, especially mid-mission.',
    caution: 'May mask overexertion—pace yourself once the rush fades to avoid collapses.',
    icon: <Activity className="w-6 h-6" />,
    color: 'from-amber-500/20 to-orange-600/20 border-amber-400/40 text-amber-200',
  },
  {
    name: 'CorticoPen',
    compound: 'Sterogen',
    purpose: 'Stabilizes pain and inflammation to keep you operational after injuries.',
    effect: 'Suppresses pain response, steadies vision, and reduces trembling from trauma.',
    idealUse: 'Pop after taking heavy ballistic or explosive damage to steady aim and mobility.',
    caution: 'Temporary relief only—seek proper treatment to prevent setbacks once it wears off.',
    icon: <ShieldPlus className="w-6 h-6" />,
    color: 'from-blue-500/20 to-indigo-600/20 border-blue-400/40 text-blue-200',
  },
  {
    name: 'DeconPen',
    compound: 'Canoiodide',
    purpose: 'Neutralizes toxins and counteracts hazardous environment exposure.',
    effect: 'Flushes contaminants and slows damage over time from poisons or caustic atmospheres.',
    idealUse: 'Carry for bunker runs, derelict salvages, or unknown planetside conditions.',
    caution: 'Pair with oxygen and suit seal checks—re-exposure will reapply toxin buildup.',
    icon: <AlertCircle className="w-6 h-6" />,
    color: 'from-emerald-500/20 to-teal-600/20 border-emerald-400/40 text-emerald-200',
  },
  {
    name: 'DetoxPen',
    compound: 'Resurgera',
    purpose: 'Clears intoxication and drug overdose effects to regain control.',
    effect: 'Resets elevated blood drug levels and improves motor control after overmedicating.',
    idealUse: 'Use when vision blurs or controls drift from stacking other meds too quickly.',
    caution: 'Do not chain multiple stimulants immediately after detox—let vitals stabilize first.',
    icon: <Syringe className="w-6 h-6" />,
    color: 'from-cyan-500/20 to-sky-600/20 border-cyan-400/40 text-cyan-200',
  },
  {
    name: 'MedPen',
    compound: 'Hemozal',
    purpose: 'Standard emergency stabilizer for quick frontline treatment.',
    effect: 'Restores health, slows bleeding, and buys time until definitive care arrives.',
    idealUse: 'Primary self-aid after firefights or accidents; easy to administer under pressure.',
    caution: 'Limited capacity—carry multiples and follow with proper triage when safe.',
    icon: <ShieldPlus className="w-6 h-6" />,
    color: 'from-red-500/20 to-rose-600/20 border-red-400/40 text-red-200',
  },
  {
    name: 'Pancea Medgel',
    compound: 'Multi-spectrum nano-gel',
    purpose: 'Topical sealant for burns, lacerations, and rapid wound closure.',
    effect: 'Creates a protective layer that stops bleeding, reduces infection risk, and stabilizes exposed tissue.',
    idealUse: 'Great for field triage when you cannot inject—apply to open wounds or burns before evacuation.',
    caution: 'Surface-level fix only—follow up with a med-bed or specialist to complete recovery.',
    icon: <Bandage className="w-6 h-6" />,
    color: 'from-lime-500/20 to-green-600/20 border-lime-400/40 text-lime-200',
  },
];

export function Codex() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-10 px-4 md:px-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
            <BookOpen className="w-7 h-7 text-cyan-300" />
          </div>
          <div>
            <p className="uppercase text-xs tracking-[0.35em] text-cyan-400/80">Codex Entry</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mt-2">Medical Pens Quick Reference</h1>
            <p className="text-slate-300 mt-3 max-w-3xl">
              A fast field guide for Onyx crews responding in the verse. Each entry lists what the pen does, when to use it, and the
              caution to keep you and your patient stable until definitive care.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ENTRIES.map((entry) => (
            <div
              key={entry.name}
              className={`relative overflow-hidden rounded-2xl border ${entry.color} bg-gradient-to-br p-6 shadow-[0_0_25px_rgba(15,23,42,0.7)]`}
            >
              <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-white/5 via-transparent to-black/20 pointer-events-none" />
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 shadow-inner text-current">
                  {entry.icon}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-wide">{entry.name}</h2>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-200/70">{entry.compound}</p>
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                <p className="text-slate-200/90"><span className="font-semibold text-white">Purpose:</span> {entry.purpose}</p>
                <p className="text-slate-200/90"><span className="font-semibold text-white">Effect:</span> {entry.effect}</p>
                <p className="text-slate-200/90"><span className="font-semibold text-white">Ideal use:</span> {entry.idealUse}</p>
                <div className="flex items-start gap-2 bg-black/40 border border-white/5 rounded-xl p-3">
                  <AlertCircle className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-100"><span className="font-semibold">Caution:</span> {entry.caution}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
