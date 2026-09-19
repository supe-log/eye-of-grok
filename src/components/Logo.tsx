import Link from "next/link";

export function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round">
        <path d="M 47 12 A 22 22 0 0 0 12 47" />
        <path d="M 17 52 A 22 22 0 0 0 52 17" />
      </g>
      <path fill="currentColor" stroke="none" d="M 3 61 Q 12 12 61 3 Q 52 52 3 61 Z" />
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
