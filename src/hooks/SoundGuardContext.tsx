import { createContext, ReactNode, useContext } from 'react';
import { useSoundGuard } from './useSoundGuard';

type SoundGuardContextValue = ReturnType<typeof useSoundGuard>;

const SoundGuardContext = createContext<SoundGuardContextValue | null>(null);

export function SoundGuardProvider({ children }: { children: ReactNode }) {
  const value = useSoundGuard();
  return (
    <SoundGuardContext.Provider value={value}>{children}</SoundGuardContext.Provider>
  );
}

export function useSoundGuardContext(): SoundGuardContextValue {
  const value = useContext(SoundGuardContext);
  if (!value) {
    throw new Error('useSoundGuardContext must be used within SoundGuardProvider');
  }
  return value;
}
