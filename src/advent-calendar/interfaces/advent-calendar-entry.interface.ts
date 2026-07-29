export interface AdventCalendarEntry {
  id: string;
  number: number;
  canParticipate: boolean;
  isActive: boolean;
  date: string;
  isSpecial: boolean;
  imageUrl?: string;
  description: string;
  linkUrl?: string;
  participants: string[];
  winners: string[];
  createdAt: string;
  updatedAt: string;
}

export function addAdventCalendarParticipant(entry: AdventCalendarEntry, userId: string): AdventCalendarEntry {
  if (entry.participants.includes(userId)) {
    return entry;
  }
  return {
    ...entry,
    participants: [...entry.participants, userId],
    updatedAt: new Date().toISOString(),
  };
}

export function addAdventCalendarWinner(entry: AdventCalendarEntry, userId: string): AdventCalendarEntry {
  if (entry.winners.includes(userId)) {
    return entry;
  }
  return {
    ...entry,
    winners: [...entry.winners, userId],
    updatedAt: new Date().toISOString(),
  };
}
