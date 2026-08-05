interface SuccessBlockProps {
  message: string;
}

export default function SuccessBlock({ message }: SuccessBlockProps) {
  if (!message) return null;

  return (
    <div
      style={{
        background: "oklch(0.25 0.10 145 / 0.4)",
        border: "1px solid oklch(0.55 0.090 145)",
        color: "var(--grim-moss)",
        padding: "12px 16px",
        marginBottom: 16,
        fontFamily: "var(--font-body)",
        fontSize: "1.1667rem",
      }}
    >
      {message}
    </div>
  );
}
