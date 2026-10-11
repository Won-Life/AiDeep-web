import type { MeetingPlatform, OnboardingRequest, UsagePurpose } from '@/api/onboarding';

export const PURPOSE_OPTIONS: { value: UsagePurpose; label: string; description: string }[] = [
  { value: 'TEAM_PROJECT', label: '팀플 · 과제 회의', description: '수업 팀 프로젝트, 과제 회의' },
  { value: 'SIDE_PROJECT', label: '사이드 프로젝트', description: '퇴근 후 · 주말에 하는 프로젝트 회의' },
  { value: 'STUDY_CLUB', label: '스터디 · 동아리', description: '정기모임, 운영 회의' },
  { value: 'COMPANY_WORK', label: '회사 업무 회의', description: '팀 회의, 기획 · 개발 회의' },
  { value: 'OTHER', label: '기타', description: '위 항목에 해당하지 않아요' },
];

export const MEETING_OPTIONS: { value: MeetingPlatform; label: string; description: string }[] = [
  { value: 'ZOOM', label: 'Zoom', description: '회의 봇이 들어가 녹음하고 노드로 정리해요' },
  { value: 'GOOGLE_MEET', label: 'Google Meet', description: '회의 봇이 들어가 녹음하고 노드로 정리해요' },
  { value: 'OFFLINE', label: '대면 회의', description: '앱 내 녹음은 추후 지원 예정이에요' },
  { value: 'OTHER', label: '기타 화상회의 도구', description: '지원 도구가 늘어나면 알려드릴게요' },
];

export function isNicknameValid(value: string) {
  const length = Array.from(value.trim()).length;
  return length >= 2 && length <= 12;
}

export function toggleMeetingPlatform(values: MeetingPlatform[], value: MeetingPlatform) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function buildOnboardingRequest(
  nickname: string, purpose: UsagePurpose | null, meeting: MeetingPlatform[],
): OnboardingRequest {
  return { userName: nickname.trim() || null, usageProposal: purpose, meeting: [...new Set(meeting)] };
}
