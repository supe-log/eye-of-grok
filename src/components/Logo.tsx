import Link from "next/link";

export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1.5 9 C 7 1.5, 25 1.5, 30.5 9 C 25 16.5, 7 16.5, 1.5 9 Z" />
      <circle cx="16" cy="9" r="4" />
      <circle cx="16" cy="9" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Logo({ href }: { href?: string }) {
  const body = (
    <>
      <LogoMark />
      <span className="logo-text">Eye of Grok</span>
    </>
  );
  if (href) {
    return (
      <Link className="logo" href={href}>
        {body}
      </Link>
    );
  }
  return <span className="logo">{body}</span>;
}
