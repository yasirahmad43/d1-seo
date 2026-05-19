import Mascot from '@/components/brand/Mascot';
import Logo from '@/components/brand/Logo';

// Wraps a login / signup / reset-password form in the D1 brand chrome —
// dark surface, ambient blue glow, mascot front-and-center.
export default function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* ambient brand glow */}
      <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full glow-brand pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full glow-brand pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-6">
        <Logo height={32} />

        <div className="card w-full text-center">
          <div className="flex justify-center mb-2">
            <Mascot size={104} />
          </div>
          {title && <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>}
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
          <div className="mt-5 text-left">{children}</div>
        </div>

        <p className="text-xs text-slate-500">
          D1 SEO Dashboard · part of <a href="https://d1techcreative.com" className="text-brand hover:underline">D1TechCreative</a>
        </p>
      </div>
    </div>
  );
}
