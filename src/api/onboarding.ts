import client from './client';

export type UsagePurpose = 'TEAM_PROJECT' | 'SIDE_PROJECT' | 'STUDY_CLUB' | 'COMPANY_WORK' | 'OTHER';
export type MeetingPlatform = 'ZOOM' | 'GOOGLE_MEET' | 'OFFLINE' | 'OTHER';

export interface OnboardingRequest {
  userName: string | null;
  usageProposal: UsagePurpose | null;
  meeting: MeetingPlatform[];
}

export async function saveOnboarding(data: OnboardingRequest): Promise<string> {
  const { data: result } = await client.post<string>('/auth/onboard', data);
  return result;
}
