// D1 Rocket-Bot mascot — white circle on dark surface ringed with a soft blue
// glow so it reads as deliberate brand on any background. Honors prefers-
// reduced-motion via the globals.css guard.
//
// Drop /public/mascot-wave.mp4 + /public/mascot-poster.png into your project,
// or override via NEXT_PUBLIC_BRAND_MASCOT_VIDEO_URL / _POSTER_URL.

type Props = {
  size?: number;
  className?: string;
};

const DEFAULT_VIDEO_URL = '/mascot-wave.mp4';
const DEFAULT_POSTER_URL = '/mascot-poster.png';

export default function Mascot({ size = 96, className = '' }: Props) {
  const video  = process.env.NEXT_PUBLIC_BRAND_MASCOT_VIDEO_URL  ?? DEFAULT_VIDEO_URL;
  const poster = process.env.NEXT_PUBLIC_BRAND_MASCOT_POSTER_URL ?? DEFAULT_POSTER_URL;

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.45) 0%, transparent 70%)',
          filter: 'blur(24px)'
        }}
      />
      <div
        className="relative w-full h-full rounded-full overflow-hidden bg-white ring-1 ring-blue-400/30 shadow-xl"
        style={{ boxShadow: '0 10px 40px rgba(37,99,235,0.25)' }}
      >
        <video
          src={video}
          poster={poster}
          autoPlay loop muted playsInline
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
