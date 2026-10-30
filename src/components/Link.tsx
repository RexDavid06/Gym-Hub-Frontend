export function Link({
  to,
  className,
  children,
  onClick,
}: {
  to: string
  className?: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={() => {
        onClick?.()
      }}
    >
      {children}
    </a>
  )
}
