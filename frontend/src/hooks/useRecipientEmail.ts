import { useState } from 'react';

const KEY = 'atscz_recipient_email';

function readStored(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function useRecipientEmail(): [string, (v: string) => void] {
  const [email, setEmailState] = useState<string>(readStored);

  function setEmail(value: string) {
    setEmailState(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // storage unavailable — keep state-only
    }
  }

  return [email, setEmail];
}
