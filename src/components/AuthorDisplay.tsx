import { useState, useEffect } from 'react';
import { getDisplayNameForUID } from '@/utils/questUtils';
import { useEffectiveUserId } from '@/lib/useEffectiveUserId';

interface AuthorDisplayProps {
  uid: string;
  className?: string;
  useImpersonation?: boolean;
}

export default function AuthorDisplay({ uid, className = "", useImpersonation = false }: AuthorDisplayProps) {
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const effectiveUserId = useEffectiveUserId();
  const displayUid = useImpersonation ? effectiveUserId || uid : uid;

  useEffect(() => {
    const loadDisplayName = async () => {
      setLoading(true);
      const name = await getDisplayNameForUID(displayUid || '');
      setDisplayName(name);
      setLoading(false);
    };

    loadDisplayName();
  }, [displayUid]);

  if (loading) {
    return <span className={`text-gray-400 ${className}`}>Loading...</span>;
  }

  return <span className={className}>{displayName}</span>;
}
