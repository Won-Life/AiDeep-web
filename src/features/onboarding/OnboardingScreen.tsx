'use client';

import Button from '@/components/ui/Button';
import AuthLayout from '@/features/auth/AuthLayout';
import AuthField from '@/features/auth/AuthField';
import OnboardingBackground from './OnboardingBackground';
import OnboardingChoices from './OnboardingChoices';
import OnboardingCompletion from './OnboardingCompletion';
import { MEETING_OPTIONS, PURPOSE_OPTIONS, isNicknameValid } from './onboardingRules';
import { useOnboarding } from './useOnboarding';

const headings = ['반가워요! 어떻게 불러드릴까요?', 'On:Node를 어디에 쓰실 건가요?', '회의는 주로 어디서 하세요?'];
const descriptions = ['On:Node에서 사용할 이름이에요. 나중에 설정에서 바꿀 수 있어요',
  '가장 가까운 걸 하나 골라주세요', '여러 개 골라도 돼요. 고르신 도구에 맞춰 회의 봇 연결을 안내해드릴게요.'];

export default function OnboardingScreen() {
  const form = useOnboarding();
  if (form.step === 4) return <OnboardingCompletion nickname={form.nickname} />;
  return (
    <AuthLayout logoSrc="/onnode/onboarding/23412.svg" background={<OnboardingBackground purpose={form.step === 2} />}
      cardClassName={`px-[min(5vw,63px)] pt-[55px] ${form.step === 1 ? 'pb-[73px] min-[900px]:-translate-y-2' : form.step === 2 ? 'pb-[68px] min-[900px]:-translate-y-[16.5px]' : 'pb-[53px] min-[900px]:-translate-y-2'}`}>
      {form.loading || form.loadError ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-6">
          <p role={form.loadError ? 'alert' : 'status'}>{form.loadError || '정보를 불러오는 중이에요'}</p>
          {form.loadError && <Button onClick={form.retryLoad}>다시 시도</Button>}
        </div>
      ) : (
        <>
          <h1 className="mt-[32px] text-center text-[20px] font-bold leading-6 text-[var(--onnode-text)]">{headings[form.step - 1]}</h1>
          <p className="mt-[11px] text-center leading-[1.2] min-[600px]:-mx-[20px]">{descriptions[form.step - 1]}</p>
          <form onSubmit={(event) => { event.preventDefault(); form.next(); }}>
            <fieldset disabled={form.saving} className={form.step === 1 ? 'mt-[34px]' : 'mt-[19px]'}>
              {form.step === 1 ? (
                <AuthField label="이름" id="onboarding-nickname" name="nickname" autoComplete="nickname"
                  value={form.nickname} onChange={(event) => form.setNickname(event.target.value)}
                  required maxLength={12} labelInset="signup"
                  invalid={Boolean(form.nickname) && !isNicknameValid(form.nickname)}
                  hint={!isNicknameValid(form.nickname) && form.nickname ? '닉네임은 2~12자로 입력해주세요' : form.user?.username ? '기존 이름을 불러왔어요. 원하면 바꿀 수 있어요' : undefined} />
              ) : form.step === 2 ? (
                <OnboardingChoices options={PURPOSE_OPTIONS} selected={form.purpose ? [form.purpose] : []} onSelect={form.setPurpose} />
              ) : (
                <OnboardingChoices options={MEETING_OPTIONS} selected={form.meeting} multiple onSelect={form.toggleMeeting} />
              )}
              {form.error && <p role="alert" className="mt-3 text-[11px] text-[var(--onnode-danger)]">{form.error}</p>}
              <Button type="submit" loading={form.saving} disabled={form.step === 1 ? !isNicknameValid(form.nickname) : form.step === 2 ? !form.purpose : !form.meeting.length}
                className={`w-full ${form.step === 1 ? 'mt-[23px]' : form.step === 2 ? 'mt-[23px]' : 'mt-[30px]'}`}>다음</Button>
              {form.step > 1 && (
                <div className="mt-[9px] flex justify-between px-4 text-[10px] leading-3">
                  <button type="button" onClick={form.previous} className="hover:underline">← 이전</button>
                  <button type="button" onClick={form.skip} className="hover:underline">건너뛰기</button>
                </div>
              )}
            </fieldset>
          </form>
          <div className={form.step === 1 ? 'mt-[36px]' : 'mt-[32px]'}>
            <p className="text-center leading-[13px]">{form.step} / 3</p>
            <div role="progressbar" aria-label="온보딩 진행" aria-valuemin={0} aria-valuemax={3} aria-valuenow={form.step}
              className="mt-[12px] h-[5px] overflow-hidden rounded-[20px] bg-[var(--onnode-primary-200)]">
              <div className={`h-full bg-[var(--onnode-primary)] ${form.step === 1 ? 'w-1/3' : form.step === 2 ? 'w-2/3' : 'w-full'}`} />
            </div>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
