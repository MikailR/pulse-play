export interface Team {
  id: string;
  sportId: string;
  name: string;
  abbreviation: string;
  logoPath: string | null;
  createdAt: number;
}

export interface CreateTeamParams {
  sportId: string;
  name: string;
  abbreviation: string;
  id?: string;
}

export interface UpdateTeamParams {
  name?: string;
  abbreviation?: string;
}
