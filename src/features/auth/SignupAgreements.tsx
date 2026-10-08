'use client';

import Image from 'next/image';

type Agreements = { terms: boolean; privacy: boolean; marketing: boolean };
const items = [
  { key: 'terms', label: '(필수) 이용약관 동의' },
  { key: 'privacy', label: '(필수) 개인정보 수집 및 이용 동의' },
  { key: 'marketing', label: '(선택) 마케팅 정보 수신 동의' },
] as const;

/*
 * CONTEXT
 * - Problem      : 동의 선택과 약관 본문 연결을 분리한다.
 * - Why          : 이번 범위의 보기 버튼은 클릭 가능하게만 제공한다.
 * - Alternatives : 임의 본문·URL 연결 → 승인하지 않은 약관을 보여준다.
 * - Trade-offs   : 보기 동작은 후속 연결한다.
 * - Edge Case    : 선택 동의는 가입 필수 조건에 포함하지 않는다.
 */
function AgreementCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-4 cursor-pointer items-center gap-[12px]">
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer size-4 appearance-none rounded-[5px] border border-[var(--onnode-primary)] checked:bg-[var(--onnode-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--onnode-primary-700)]"
        />
        <Image
          src="/onnode/auth/imgCheck.svg"
          width={16}
          height={16}
          alt=""
          unoptimized
          className="pointer-events-none absolute hidden peer-checked:block"
        />
      </span>
      {label}
    </label>
  );
}

export default function SignupAgreements({
  value,
  onChange,
}: {
  value: Agreements;
  onChange: (value: Agreements) => void;
}) {
  const allChecked = value.terms && value.privacy && value.marketing;
  return (
    <div className="text-[11px] leading-[14px]">
      <div className="border-b border-[var(--onnode-primary)] pb-[9px] font-semibold text-[var(--onnode-text)]">
        <AgreementCheckbox
          label="전체 동의"
          checked={allChecked}
          onChange={() =>
            onChange({
              terms: !allChecked,
              privacy: !allChecked,
              marketing: !allChecked,
            })
          }
        />
      </div>
      <div className="mt-[8px] flex flex-col gap-[8px]">
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-2"
          >
            <AgreementCheckbox
              label={item.label}
              checked={value[item.key]}
              onChange={() =>
                onChange({ ...value, [item.key]: !value[item.key] })
              }
            />
            <button
              type="button"
              aria-label={`${item.label} 보기`}
              className="shrink-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              보기 &gt;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
