import Mascot from '@/components/brand/Mascot';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Working late';
}

// Top-of-dashboard welcome card matching the d1app / d1-affiliates pattern.
export default function WelcomeCard({ name, subtitle }: { name?: string; subtitle?: string }) {
  return (
    <div className="card relative overflow-hidden">
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full glow-brand pointer-events-none" />
      <div className="relative flex items-center gap-5">
        <Mascot size={104} className="animate-float" />
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">{greeting()}</div>
          <div className="text-2xl font-extrabold tracking-tight">{name ?? 'Welcome back'}</div>
          {subtitle && <div className="text-sm text-slate-400 mt-1">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
