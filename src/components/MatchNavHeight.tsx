"use client";
import { useEffect, useRef } from "react";

interface MatchNavHeightProps {
  nav: React.ReactNode;
  main: React.ReactNode;
}

export default function MatchNavHeight({ nav, main }: MatchNavHeightProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateHeight() {
      if (navRef.current && mainRef.current) {
        const navH = navRef.current.scrollHeight;
        mainRef.current.style.minHeight = navH + "px";
      }
    }
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  return (
    <div className="flex items-stretch">
      <div ref={navRef} className="flex-shrink-0">
        {nav}
      </div>
      <div ref={mainRef} className="flex-1 bg-gray-50 dark:bg-gray-800">
        {main}
      </div>
    </div>
  );
}
