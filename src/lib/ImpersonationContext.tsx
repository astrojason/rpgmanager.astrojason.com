import { createContext, useContext } from "react";

export interface ImpersonationContextType {
  impersonatedUserId?: string;
  setImpersonatedUserId: (uid?: string) => void;
}

export const ImpersonationContext = createContext<ImpersonationContextType>({
  impersonatedUserId: undefined,
  setImpersonatedUserId: () => {},
});

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
