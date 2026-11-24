import { Award, BarChart3, Calendar, Dumbbell, Settings } from 'lucide-react';

export type AppTab = 'home' | 'history' | 'awards' | 'stats' | 'settings';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const NAV_ITEMS: { id: AppTab; label: string; icon: typeof Dumbbell }[] = [
  { id: 'home', label: 'Today', icon: Dumbbell },
  { id: 'history', label: 'History', icon: Calendar },
  { id: 'awards', label: 'Awards', icon: Award },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <>
      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Primary Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0F131B]/95 backdrop-blur-md border-t border-white/[0.08] pb-safe"
      >
        <div className="grid grid-cols-5 h-15">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.8} />
                <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Navigation Bar */}
      <header className="hidden md:block sticky top-0 z-30 bg-[#0B0E14]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <div className="font-display text-xl font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0">
            IronLog
          </div>

          <nav aria-label="Desktop Navigation" className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    isActive
                      ? 'text-blue-400 border-blue-400'
                      : 'text-slate-400 border-transparent hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="text-xs text-slate-400 whitespace-nowrap shrink-0">
            6-Day Split
          </div>
        </div>
      </header>
    </>
  );
}
