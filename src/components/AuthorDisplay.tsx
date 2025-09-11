import { useState, useEffect } from 'react';
import { getDisplayNameForUID } from '@/utils/questUtils';

interface AuthorDisplayProps {
  uid: string;
  className?: string;
}

export default function AuthorDisplay({ uid, className = "" }: AuthorDisplayProps) {
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDisplayName = async () => {
      setLoading(true);
      const name = await getDisplayNameForUID(uid);
      setDisplayName(name);
      setLoading(false);
    };

    loadDisplayName();
  }, [uid]);

  if (loading) {
    return <span className={`text-gray-400 ${className}`}>Loading...</span>;
  }

  return <span className={className}>{displayName}</span>;
}
