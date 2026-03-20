export interface User {
  uid: string;
  username: string;
  email: string | null;
  isAdmin: boolean;
}

export interface Tournament {
  id: number;
  name: string;
  description: string;
  creatorId: number;
  status: 'pending' | 'active' | 'completed';
}

export interface Participant {
  id: number;
  tournamentId: number;
  userId: number;
  username?: string; // Will be joined
}

export interface Match {
  id: number;
  tournamentId: number;
  round: number;
  matchNumber: number;
  participant1Id: number | null;
  participant2Id: number | null;
  winnerId: number | null;
  score1: number | null;
  score2: number | null;
  participant1?: Participant;
  participant2?: Participant;
}
