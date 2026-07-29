export interface EasterEggLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface EasterEgg {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  prizeDescription?: string;
  numberOfWinners?: number;
  startDate: string;
  endDate?: string;
  location: EasterEggLocation;
  participants: string[];
  winners: string[];
  createdAt: string;
  updatedAt: string;
}

export function isEasterEggActive(egg: EasterEgg): boolean {
  const now = new Date().toISOString().split('T')[0];
  if (now < egg.startDate) {
    return false;
  }
  if (egg.endDate && now > egg.endDate) {
    return false;
  }
  return true;
}

export function addEasterEggParticipant(egg: EasterEgg, userId: string): EasterEgg {
  if (egg.participants.includes(userId)) {
    return egg;
  }
  return {
    ...egg,
    participants: [...egg.participants, userId],
    updatedAt: new Date().toISOString(),
  };
}

export function addEasterEggWinner(egg: EasterEgg, userId: string): EasterEgg {
  if (egg.winners.includes(userId)) {
    return egg;
  }
  return {
    ...egg,
    winners: [...egg.winners, userId],
    updatedAt: new Date().toISOString(),
  };
}
