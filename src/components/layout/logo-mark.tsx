export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left vertical bar of the R */}
      <rect x="2" y="2" width="7" height="28" rx="1.5" fill="#E85400" />
      {/* Bowl of the R */}
      <path
        d="M9 2h10a8 8 0 0 1 0 16H9V2z"
        fill="#E85400"
      />
      {/* Diagonal leg */}
      <path
        d="M17.5 18L27 30H20L13 18h4.5z"
        fill="#E85400"
      />
      {/* Shadow on the diagonal leg */}
      <path
        d="M19.5 18L27 30h-4L15.5 18h4z"
        fill="#B03A00"
      />
    </svg>
  )
}
