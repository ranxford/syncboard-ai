import Link from "next/link";

export function BrandLogo({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`text-base font-semibold tracking-tight text-gray-100 hover:text-white ${className}`}
    >
      SyncBoard
    </Link>
  );
}
