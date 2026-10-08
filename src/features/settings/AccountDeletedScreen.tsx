'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function AccountDeletedScreen() {
  return (
    <div className="settings-deleted-screen">
      <section
        className="settings-card settings-deleted-card"
        aria-labelledby="account-deleted-title"
      >
        <div className="settings-deleted-art" aria-hidden="true">
          <div className="settings-deleted-blue">
            <Image
              src="/onnode/settings/786e6.svg"
              width={89.4365}
              height={81.8546}
              alt=""
            />
            <span />
            <span />
          </div>
          <div className="settings-deleted-pink">
            <Image
              src="/onnode/settings/53d58.svg"
              width={52.3972}
              height={44.4884}
              alt=""
            />
            <Image
              className="settings-deleted-mouth"
              src="/onnode/settings/521ba.svg"
              width={21.8589}
              height={11.1963}
              alt=""
            />
          </div>
        </div>
        <h1 id="account-deleted-title">계정이 삭제됐어요</h1>
        <p>그동안 On:Node를 이용해 주셔서 감사합니다</p>
        <Link href="/login" className="settings-home-button">
          처음 화면으로
        </Link>
      </section>
    </div>
  );
}
