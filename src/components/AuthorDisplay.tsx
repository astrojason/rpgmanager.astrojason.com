import React, { useState, useEffect } from 'react';
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
  const effectiveUid = useEffectiveUserId();

  useEffect(() => {
    const loadDisplayName = async () => {
      setLoading(true);
      const name = await getDisplayNameForUID(useImpersonation ? (effectiveUid ?? uid) : uid);
      setDisplayName(name);
      setLoading(false);
    };

    loadDisplayName();
  }, [uid, useImpersonation, effectiveUid]);

  if (loading) {
    return <span className={`text-gray-400 ${className}`}>Loading...</span>;
  }

  return <span className={className}>{displayName}</span>;
}
