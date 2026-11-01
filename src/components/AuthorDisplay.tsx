import React, { useState, useEffect } from 'react';
import { getDisplayNameForUID } from '@/utils/questUtils';
import { useEffectiveUserId } from '@/lib/useEffectiveUserId';
import ErrorBlock, { toErrorMessage } from '@/components/ErrorBlock';

interface AuthorDisplayProps {
  uid: string;
  className?: string;
  useImpersonation?: boolean;
}

export default function AuthorDisplay({ uid, className = "", useImpersonation = false }: AuthorDisplayProps) {
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const effectiveUid = useEffectiveUserId();

  useEffect(() => {
    const loadDisplayName = async () => {
      setLoading(true);
      setError(null);
      try {
        const name = await getDisplayNameForUID(useImpersonation ? (effectiveUid ?? uid) : uid);
        setDisplayName(name);
      } catch (e) {
        setError(toErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };

    loadDisplayName();
  }, [uid, useImpersonation, effectiveUid]);

  if (loading) {
    return <span className={`text-gray-400 ${className}`}>Loading...</span>;
  }

  if (error) {
    return <ErrorBlock error={error} onDismiss={() => setError(null)} />;
  }

  return <span className={className}>{displayName}</span>;
}
