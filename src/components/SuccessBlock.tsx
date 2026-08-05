interface SuccessBlockProps {
  message: string;
}

export default function SuccessBlock({ message }: SuccessBlockProps) {
  if (!message) return null;

  return (
    <div className="bg-grim-success-bg border border-grim-moss text-grim-moss px-4 py-3 mb-4 font-body text-lg">
      {message}
    </div>
  );
}
