import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AirtelLogo, StarlinkLogo } from './Logos';
import { INTERNET_PLANS } from '../data/plans';
import { InternetPlan } from '../types';
import { LanguageSwitch } from './LanguageSwitch';
import { useApp } from '../context/AppContext';
import { AIRTEL_COUNTRIES } from '../data/countries';
import {
  Check,
  Wifi,
  ChevronDown,
  Radio,
  Zap,
  Shield,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface PlansPageProps {
  onSelectPlan: (plan: InternetPlan) => void;
}

export type PlanCategoryFilter = 'starlink';

interface FilterOptionConfig {
  id: PlanCategoryFilter;
  labelKey: 'filterStarlink';
  sublabelKey: 'filterStarlinkSub';
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FILTER_CONFIGS: FilterOptionConfig[] = [
  {
    id: 'starlink',
    labelKey: 'filterStarlink',
    sublabelKey: 'filterStarlinkSub',
    badge: 'LEO Constellation',
    icon: Radio,
  },
];

export const PlansPage: React.FC<PlansPageProps> = ({ onSelectPlan }) => {
  const { country, setCountry, language, t } = useApp();
  const [selectedFilter] = useState<PlanCategoryFilter>('starlink');
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState<boolean>(false);
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null);
  const headerCountryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: Event) => {
      if (headerCountryRef.current && !headerCountryRef.current.contains(e.target as Node)) {
        setIsCountryPickerOpen(false);
      }
    };
    if (isCountryPickerOpen) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isCountryPickerOpen]);

  // Filter logic keeping strictly Starlink Network plans
  const filteredPlans = INTERNET_PLANS;
  const activeConfig = FILTER_CONFIGS[0];
  const ActiveIcon = activeConfig.icon;
  const activeLabel = t(activeConfig.labelKey);
  const activeSublabel = t(activeConfig.sublabelKey);

  // Helper to translate plan validity
  const formatValidity = (validity: string) => {
    if (language === 'en') {
      return validity
        .replace('Valide', 'Valid')
        .replace('Jours', 'Days')
        .replace('Jour', 'Day');
    }
    return validity;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e50000] via-[#c90000] to-[#990000] text-white flex flex-col selection:bg-amber-400 selection:text-neutral-900 overflow-x-hidden w-full">
      {/* Top Header Bar */}
      <header className="w-full border-b border-white/15 bg-black/15 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[68px] py-2.5 flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-3 sm:gap-5">
            <AirtelLogo variant="white" className="h-7 sm:h-8" />
            <div className="hidden sm:block h-6 w-[1px] bg-white/30" />
            <StarlinkLogo className="hidden sm:inline-flex" />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Country Selector in Header */}
            <div ref={headerCountryRef} className="relative">
              <button
                type="button"
                id="btn-header-country-select"
                onClick={() => setIsCountryPickerOpen(!isCountryPickerOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95"
                title={t('selectCountry')}
              >
                <span className="text-base">{country.flag}</span>
                <span className="hidden xs:inline truncate max-w-[100px] sm:max-w-none">
                  {language === 'fr' ? country.nameFr : country.nameEn}
                </span>
                <span className="text-[10px] text-amber-300 font-mono">({country.dialCode})</span>
                <ChevronDown className="w-3 h-3 text-white/70 ml-0.5" />
              </button>

              {/* Country dropdown popup in header */}
              <AnimatePresence>
                {isCountryPickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 4, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute right-0 top-full mt-1 w-64 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-white/20 shadow-2xl p-2 z-50 max-h-[340px] overflow-y-auto space-y-1 text-white"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-bold text-white/50 uppercase tracking-widest border-b border-white/10 mb-1">
                      {t('selectCountry')}
                    </div>
                    {AIRTEL_COUNTRIES.map((c) => {
                      const isSelected = country.id === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCountry(c, false);
                            setIsCountryPickerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#E60000] text-white font-bold'
                              : 'hover:bg-white/10 text-white/90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{c.flag}</span>
                            <span className="truncate">{language === 'fr' ? c.nameFr : c.nameEn}</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-white/70 ml-1">
                            {c.dialCode}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Language Switcher */}
            <LanguageSwitch variant="transparent" />

            {/* Status indicator on desktop */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white/90 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('starlinkStatusGlobal')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero & Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 flex flex-col items-center">
        {/* Badge Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 shadow-lg mb-5 max-w-full text-center"
        >
          <Wifi className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="text-xs sm:text-sm font-bold tracking-wide text-white truncate">
            {t('badgeTag')}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-neutral-900 text-[10px] font-black tracking-wider uppercase shrink-0">
            {t('directToCell')}
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center max-w-3xl mb-6 sm:mb-8 px-2"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.15] text-white">
            {t('heroTitle1')} <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-md">
              {t('heroTitle2')}
            </span>
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-base md:text-lg text-white/90 font-medium max-w-xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>
        </motion.div>

        {/* ========================================================================= */}
        {/* DEDICATED STARLINK NETWORK CATEGORY BANNER (Mobile & Desktop Responsive) */}
        {/* ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="w-full max-w-4xl mb-6 px-1"
        >
          <div className="w-full p-4 sm:p-5 rounded-2xl bg-black/35 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/30 to-amber-500/10 flex items-center justify-center text-amber-300 shrink-0 border border-amber-300/30 shadow-inner">
                <ActiveIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                    {t('categorySelected')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-black uppercase tracking-wider">
                    {activeConfig.badge}
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Opérationnel</span>
                  </div>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                  {activeLabel}
                </h2>
                <p className="text-xs text-white/80 font-medium truncate mt-0.5 max-w-md">
                  {activeSublabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:self-center shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
              <div className="text-left sm:text-right">
                <div className="text-[10px] font-bold uppercase text-white/60 tracking-wider">
                  {t('showingPlans')}
                </div>
                <div className="text-sm font-black text-white">
                  {filteredPlans.length} {t('plansWord')}
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-white text-[#E60000] text-xs font-black shadow-md flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#E60000] stroke-[3]" />
                <span>{activeLabel}</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Plans Grid (100% responsive, no side-scroll, perfectly fits mobile screens) */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8 w-full max-w-6xl"
        >
          {filteredPlans.map((plan, index) => {
            const isHovered = hoveredPlanId === plan.id;
            return (
              <motion.div
                key={plan.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                onMouseEnter={() => setHoveredPlanId(plan.id)}
                onMouseLeave={() => setHoveredPlanId(null)}
                className={`relative rounded-3xl bg-white text-neutral-900 overflow-hidden shadow-2xl transition-all duration-300 flex flex-col justify-between border-2 ${
                  plan.isPopular
                    ? 'border-amber-400 ring-4 ring-amber-400/20'
                    : isHovered
                    ? 'border-red-500 scale-[1.01]'
                    : 'border-transparent'
                }`}
              >
                {/* Popular / Best Value Ribbon */}
                {plan.isPopular && (
                  <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-neutral-950 text-center py-1.5 px-4 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>{t('popularRibbon')}</span>
                  </div>
                )}

                {/* Plan Content */}
                <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header Row */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-xl bg-red-100/70 text-[#E60000] font-black text-xs uppercase tracking-wider">
                        {formatValidity(plan.validity)}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-500">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{t('starlinkNetwork')}</span>
                      </div>
                    </div>

                    {/* Data Size Display */}
                    <div className="my-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-900">
                          {plan.dataAmount}
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-[#E60000]">
                          {plan.dataUnit}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-500 mt-1">
                        {t('highSpeedLeo')}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="my-4 pt-3 border-t border-neutral-100 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-neutral-900">
                        {plan.price}
                      </span>
                      <span className="text-xs font-medium text-neutral-400">{t('perPlan')}</span>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 my-4">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-700 font-medium">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Bottom CTA Button */}
                <div className="p-4 sm:p-6 bg-neutral-50 border-t border-neutral-100">
                  <button
                    type="button"
                    id={`btn-select-plan-${plan.id}`}
                    onClick={() => onSelectPlan(plan)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#E60000] hover:bg-[#c40000] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>{t('choosePlan')}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Security & Starlink Guarantee Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 sm:mt-16 mb-6 max-w-3xl w-full bg-white/10 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{t('securityTitle')}</h4>
              <p className="text-xs text-white/80 leading-relaxed mt-0.5">
                {t('securityDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3.5 py-1.5 rounded-xl bg-white text-[#E60000] font-black text-xs uppercase tracking-wider shadow-sm">
              {t('securityBadge')}
            </span>
          </div>
        </motion.div>
      </main>

      {/* Spacious Uncluttered Responsive Footer */}
      <footer className="w-full border-t border-white/15 bg-black/30 backdrop-blur-xl mt-12 sm:mt-24 pt-8 pb-10 sm:pt-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center gap-4 sm:gap-6">
          {/* Brand partnership line */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <AirtelLogo variant="white" size="sm" />
            <span className="text-white/40 text-xs hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-white uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>STARLINK™</span>
            </div>
          </div>

          {/* Clean metadata copy */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 text-xs text-white/70 flex-wrap leading-relaxed">
            <span>© 2026 {country.airtelBrand}</span>
            <span className="text-white/40 hidden sm:inline">•</span>
            <span>{t('satellitePartner')}</span>
            <span className="text-white/40 hidden sm:inline">•</span>
            <span>{t('copyright')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
