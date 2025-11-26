import { Session } from '../types';

const STORAGE_KEY = 'scribeai_sessions_v1';

export const saveSession = (session: Session): void => {
  const sessions = getSessions();
  const existingIndex = sessions.findIndex((s) => s.id === session.id);
  
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.unshift(session);
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save session to localStorage', e);
  }
};

export const getSessions = (): Session[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse sessions', e);
    return [];
  }
};

export const getSessionById = (id: string): Session | undefined => {
  return getSessions().find((s) => s.id === id);
};

export const deleteSession = (id: string): void => {
  const sessions = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};
