// Theme-aware D1TechCreative logo.
// On dark surfaces (the default here) use the WHITE variant.

const LIGHT_VARIANT_URL = 'https://www.d1techcreative.com/wp-content/uploads/2024/05/d1techcreative-on-white10-2048x494.png';
const DARK_VARIANT_URL  = 'https://www.d1techcreative.com/wp-content/uploads/2026/05/output-onlinepngtools.png';

type Props = {
  height?: number;
  variant?: 'auto' | 'light' | 'dark';
  className?: string;
};

export default function Logo({ height = 28, variant = 'auto', className = '' }: Props) {
  const effective = variant === 'auto' ? 'dark' : variant;
  const src = effective === 'light'
    ? (process.env.NEXT_PUBLIC_BRAND_LOGO_URL_LIGHT ?? LIGHT_VARIANT_URL)
    : (process.env.NEXT_PUBLIC_BRAND_LOGO_URL ?? DARK_VARIANT_URL);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="D1TechCreative" height={height} style={{ height, width: 'auto' }} className={className} />
  );
}
