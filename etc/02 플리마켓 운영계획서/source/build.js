const pptxgen = require("pptxgenjs");
const path = require("path");

const IMG = (name) => path.join(__dirname, "images", name);

// ---- Palette ---------------------------------------------------------
const GREEN = "A6E600";   // brand lime accent (from AiDeep card news)
const GREEN_DK = "7FB100";
const DARK = "1C1C1E";    // charcoal background (product/booth/closing slides)
const DARK2 = "29292C";   // panel tone on dark bg
const LIGHT = "F2FAF6";   // pale mint-white background (content slides)
const CARD = "FFFFFF";
const INK = "1C1C1E";
const TEAL_INK = "1E6E52"; // deep teal-green — headlines on light bg (matches final banner)
const MUTED = "6E6E73";
const WHITE = "FFFFFF";
const MIST_1 = "CFEFE1";
const MIST_2 = "9FDCC3";
const MIST_3 = "6FC2A3";

const HEAD_FONT = "Apple SD Gothic Neo";
const BODY_FONT = "Apple SD Gothic Neo";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.author = "AiDeep";
pres.title = "AiDeep 플리마켓 운영계획서";

const PW = 13.333, PH = 7.5;
const TOTAL_SLIDES = 8;

// ---- helpers -----------------------------------------------------------
function bg(slide, color) {
  slide.background = { color };
}

// Soft watercolor-mist corner accent — a few overlapping translucent ovals,
// echoing the final banner's "misty edges, clean center" look without needing raster assets.
function mistCorner(slide, x, y, size) {
  const layers = [
    { scale: 1.0, color: MIST_1, transparency: 55 },
    { scale: 0.72, color: MIST_2, transparency: 45 },
    { scale: 0.42, color: MIST_3, transparency: 55 },
  ];
  layers.forEach((l) => {
    const w = size * l.scale;
    slide.addShape(pres.shapes.OVAL, {
      x: x + (size - w) / 2, y: y + (size - w) / 2, w, h: w,
      fill: { color: l.color, transparency: l.transparency }, line: { type: "none" },
    });
  });
}

// Small repeating brand motif: three connected graph nodes, our visual signature
function nodeMotif(slide, x, y, color, scale = 1) {
  const s = scale;
  const lineOpt = () => ({ color, width: 1.5 * s });
  slide.addShape(pres.shapes.LINE, { x: x + 0.14 * s, y: y + 0.08 * s, w: 0.30 * s, h: 0.22 * s, line: lineOpt() });
  slide.addShape(pres.shapes.LINE, { x: x + 0.14 * s, y: y + 0.30 * s, w: 0.30 * s, h: -0.16 * s, line: lineOpt() });
  slide.addShape(pres.shapes.OVAL, { x, y, w: 0.16 * s, h: 0.16 * s, fill: { color }, line: { type: "none" } });
  slide.addShape(pres.shapes.OVAL, { x: x + 0.42 * s, y: y - 0.06 * s, w: 0.12 * s, h: 0.12 * s, fill: { color }, line: { type: "none" } });
  slide.addShape(pres.shapes.OVAL, { x: x + 0.42 * s, y: y + 0.30 * s, w: 0.12 * s, h: 0.12 * s, fill: { color }, line: { type: "none" } });
}

function pageNum(slide, n, dark) {
  slide.addText(`${n} / ${TOTAL_SLIDES}`, {
    x: PW - 1.3, y: PH - 0.55, w: 1.0, h: 0.35,
    fontSize: 10, color: dark ? "8A8A8E" : "9A9A9E", fontFace: BODY_FONT, align: "right",
  });
  slide.addText("AiDeep", {
    x: 0.6, y: PH - 0.55, w: 2.0, h: 0.35,
    fontSize: 10, bold: true, color: dark ? "8A8A8E" : "9A9A9E", fontFace: HEAD_FONT, charSpacing: 1,
  });
}

function kicker(slide, text, x, y, color, textColor) {
  const w = 0.22 + text.length * 0.135;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h: 0.34, rectRadius: 0.17,
    fill: { type: "none" }, line: { color, width: 1.25 },
  });
  slide.addText(text, {
    x, y: y - 0.01, w, h: 0.36, align: "center", valign: "middle",
    fontSize: 11, bold: true, color: textColor, fontFace: BODY_FONT, charSpacing: 1,
  });
}

function title(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.7, y: 0.62, w: PW - 1.4, h: 0.9,
    fontSize: opts.fontSize || 32, bold: true, color: opts.color || TEAL_INK,
    fontFace: HEAD_FONT, align: "left",
  });
}

function eyebrow(slide, text, color) {
  slide.addText(text.toUpperCase(), {
    x: 0.72, y: 0.32, w: 8, h: 0.3, fontSize: 12, bold: true, color, fontFace: BODY_FONT, charSpacing: 2,
  });
}

// =========================================================================
// SLIDE 1 — Cover
// =========================================================================
{
  const s = pres.addSlide();
  bg(s, LIGHT);
  mistCorner(s, -1.6, -1.9, 5.2);
  mistCorner(s, PW - 3.4, PH - 3.1, 5.0);

  kicker(s, "2026 인천 청년 오프라인 마켓 · 서스테이너블웨이브 페스티벌", 0.7, 0.55, GREEN_DK, GREEN_DK);

  s.addText("AiDeep", {
    x: 0.65, y: 1.05, w: 10, h: 1.1, fontSize: 64, bold: true, color: TEAL_INK, fontFace: HEAD_FONT,
  });
  s.addText("쌓이고 방치되는 기록들,\n이제는 모아서 정리해드릴게요", {
    x: 0.68, y: 2.2, w: 10.5, h: 0.95, fontSize: 25, bold: true, color: TEAL_INK, fontFace: HEAD_FONT, lineSpacingMultiple: 1.2,
  });
  s.addText("기록을 나만의 자산으로\n만들어드려요", {
    x: 0.68, y: 3.28, w: 10.5, h: 0.85, fontSize: 19, bold: true, color: TEAL_INK, fontFace: HEAD_FONT, lineSpacingMultiple: 1.2,
  });
  s.addText("기록 관리로 디지털 탄소 감축까지 · 나의 작은 실천이 지구를 살려요", {
    x: 0.7, y: 4.28, w: 11, h: 0.4, fontSize: 13, italic: true, bold: true, color: GREEN_DK, fontFace: BODY_FONT,
  });

  s.addShape(pres.shapes.LINE, { x: 0.7, y: 5.15, w: 3.2, h: 0, line: { color: "D8ECE3", width: 1 } });
  s.addText([
    { text: "팀명   ", options: { color: MUTED } },
    { text: "[팀명을 입력하세요]", options: { color: INK, bold: true } },
  ], { x: 0.7, y: 5.35, w: 5.5, h: 0.35, fontSize: 13, fontFace: BODY_FONT });
  s.addText([
    { text: "대표자   ", options: { color: MUTED } },
    { text: "[이름을 입력하세요]", options: { color: INK, bold: true } },
  ], { x: 0.7, y: 5.7, w: 5.5, h: 0.35, fontSize: 13, fontFace: BODY_FONT });
  s.addText([
    { text: "연락처   ", options: { color: MUTED } },
    { text: "tangbole@naver.com", options: { color: INK, bold: true } },
  ], { x: 0.7, y: 6.05, w: 5.5, h: 0.35, fontSize: 13, fontFace: BODY_FONT });

  nodeMotif(s, 11.6, 6.55, GREEN_DK, 1.3);
  pageNum(s, 1, false);
}

// =========================================================================
// SLIDE 2 — 문제 정의 / 왜 지금 AiDeep인가
// =========================================================================
{
  const s = pres.addSlide();
  bg(s, LIGHT);
  eyebrow(s, "Why AiDeep", GREEN_DK);
  title(s, "기록만 하고, 다시 들여다본 적 있나요?");

  const bullets = [
    ["쌓이기만 하는 메모와 캡처", "떠오른 생각, 회의록, 문서, 스크린샷... 저장은 쉬운데 다시 찾아보는 일은 없습니다."],
    ["정리는 언제나 '다음'으로 미뤄집니다", "언젠가 정리해야지 하다가, 기록은 방치된 채로 계속 쌓여만 갑니다."],
    ["방치된 기록은, 사실 디지털 탄소입니다", "쓰이지 않고 저장만 되는 데이터도 서버 공간과 전력을 씁니다. 정리되지 않은 기록 하나하나가 조용히 탄소를 만듭니다."],
  ];
  let y = 1.85;
  bullets.forEach(([h, d]) => {
    s.addShape(pres.shapes.OVAL, { x: 0.72, y: y + 0.06, w: 0.14, h: 0.14, fill: { color: GREEN }, line: { type: "none" } });
    s.addText(h, { x: 1.05, y, w: 5.7, h: 0.4, fontSize: 16, bold: true, color: INK, fontFace: HEAD_FONT });
    s.addText(d, { x: 1.05, y: y + 0.4, w: 5.7, h: 0.55, fontSize: 12, color: MUTED, fontFace: BODY_FONT });
    y += 1.15;
  });

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.7, y: 5.55, w: 6.05, h: 0.95, rectRadius: 0.08, fill: { color: DARK }, line: { type: "none" },
  });
  s.addText("안개 낀 머릿속, AiDeep이 그래프로 맑게 걷어냅니다.", {
    x: 1.0, y: 5.55, w: 5.5, h: 0.95, fontSize: 16, bold: true, color: GREEN, fontFace: HEAD_FONT, valign: "middle",
  });

  // real product marketing cards, right column
  s.addImage({ path: IMG("card_problem.png"), x: 7.35, y: 1.55, w: 2.55, h: 3.19 });
  s.addImage({ path: IMG("card_burden.png"), x: 10.1, y: 1.55, w: 2.55, h: 3.19 });
  s.addText("실제 AiDeep 인스타그램 카드뉴스", {
    x: 7.35, y: 4.82, w: 5.3, h: 0.3, fontSize: 10, italic: true, color: MUTED, fontFace: BODY_FONT, align: "center",
  });

  pageNum(s, 2, false);
}

// =========================================================================
// SLIDE 3 — 핵심 기능 3단계
// =========================================================================
{
  const s = pres.addSlide();
  bg(s, LIGHT);
  eyebrow(s, "How it works", GREEN_DK);
  title(s, "설치만 하면 끝. 녹화도 업로드도 필요 없어요.");
  s.addText("회의도 결국 하나의 기록입니다. 자막 → AI 구조화 → 그래프뷰, 세 단계가 저절로 끝납니다 — 나는 듣기만 하면 됩니다.", {
    x: 0.7, y: 1.5, w: 11, h: 0.4, fontSize: 13, color: MUTED, fontFace: BODY_FONT,
  });

  const steps = [
    ["01", "자막 자동 수집", "Meet 자막(CC)을 켜면 발화가 실시간으로 누적됩니다. 녹화 · 업로드 · 별도 앱 설치가 전혀 필요 없습니다."],
    ["02", "AI 실시간 구조화", "누적된 대화에서 안건 · 결정사항 · 액션아이템 · 미해결 질문을 AI가 자동으로 뽑아냅니다."],
    ["03", "그래프뷰로 시각화", "회의 제목 → 섹션 → 항목이 노드 트리로 펼쳐집니다. 클릭해서 바로 고치고, 자유롭게 옮길 수 있습니다."],
  ];
  const colW = 3.75, gap = 0.35, x0 = 0.7;
  steps.forEach((st, i) => {
    const x = x0 + i * (colW + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 2.25, w: colW, h: 4.05, rectRadius: 0.1, fill: { color: CARD }, line: { color: "E4E4DF", width: 1 },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 3, angle: 90, opacity: 0.06 },
    });
    s.addText(st[0], { x: x + 0.3, y: 2.5, w: 1.5, h: 0.7, fontSize: 34, bold: true, color: "E1EEC0", fontFace: HEAD_FONT });
    if (i < 2) {
      s.addShape(pres.shapes.LINE, { x: x + colW + 0.04, y: 4.25, w: gap - 0.08, h: 0, line: { color: GREEN_DK, width: 2, endArrowType: "triangle" } });
    }
    s.addText(st[1], { x: x + 0.3, y: 3.2, w: colW - 0.6, h: 0.5, fontSize: 17, bold: true, color: INK, fontFace: HEAD_FONT });
    s.addText(st[2], { x: x + 0.3, y: 3.75, w: colW - 0.6, h: 2.35, fontSize: 12.5, color: MUTED, fontFace: BODY_FONT, valign: "top", lineSpacingMultiple: 1.25 });
  });

  pageNum(s, 3, false);
}

// =========================================================================
// SLIDE 4 — 제품 사진 (필수 항목)
// =========================================================================
{
  const s = pres.addSlide();
  bg(s, DARK);
  eyebrow(s, "Product", GREEN);
  title(s, "말로 한 회의가, 눈에 보이는 지도가 됩니다", { color: WHITE });

  // real screenshots — fixed common height so both rows/captions/banner align
  const imgY = 1.75, imgH = 3.35;
  const w1 = imgH * (1550 / 851);
  s.addImage({ path: IMG("shot_structure.png"), x: 0.7, y: imgY, w: w1, h: imgH });
  s.addText("회의 중 실시간 구조화 패널 — 자막 수집 · 구조화 · 그래프 반영이 버튼 하나", {
    x: 0.7, y: imgY + imgH + 0.15, w: w1, h: 0.45, fontSize: 11.5, color: "B7B7BC", fontFace: BODY_FONT,
  });

  const w2 = imgH * (805 / 535);
  const x2 = 12.63 - w2;
  s.addImage({ path: IMG("shot_graph.png"), x: x2, y: imgY, w: w2, h: imgH });
  s.addText("완성된 그래프뷰 — 노드도 연결선도 내 맘대로 움직이는 마인드맵", {
    x: x2, y: imgY + imgH + 0.15, w: w2, h: 0.45, fontSize: 11.5, color: "B7B7BC", fontFace: BODY_FONT,
  });

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.7, y: 6.05, w: 11.95, h: 0.65, rectRadius: 0.08, fill: { color: DARK2 }, line: { type: "none" },
  });
  s.addText("노드를 클릭하면 바로 텍스트 편집 · 줄글 문서 작업도 가능", {
    x: 1.0, y: 6.05, w: 11.4, h: 0.65, fontSize: 14, bold: true, color: GREEN, fontFace: HEAD_FONT, valign: "middle",
  });

  pageNum(s, 4, true);
}

// =========================================================================
// SLIDE 5 — 판매 상품 목록 & 가격 (필수 항목)
// =========================================================================
{
  const s = pres.addSlide();
  bg(s, LIGHT);
  eyebrow(s, "Menu & Price", GREEN_DK);
  title(s, "판매 상품 목록 & 가격표");

  // ---- 대표 상품: 웹 서비스 hero card ----
  const heroY = 1.5, heroH = 2.55;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.7, y: heroY, w: 11.95, h: heroH, rectRadius: 0.1, fill: { color: DARK }, line: { type: "none" },
  });
  kicker(s, "대표 상품 · WEB SERVICE", 1.0, heroY + 0.22, GREEN, GREEN);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 9.55, y: heroY + 0.22, w: 2.75, h: 0.4, rectRadius: 0.2, fill: { color: GREEN }, line: { type: "none" },
  });
  s.addText("무료 체험 · FREE", {
    x: 9.55, y: heroY + 0.22, w: 2.75, h: 0.4, align: "center", valign: "middle",
    fontSize: 12, bold: true, color: INK, fontFace: BODY_FONT,
  });
  s.addText("AiDeep", {
    x: 1.0, y: heroY + 0.68, w: 10.7, h: 0.55, fontSize: 34, bold: true, color: GREEN, fontFace: HEAD_FONT,
  });
  s.addText("쌓이고 방치되던 기록을, 나만의 자산으로 정리해주는 서비스", {
    x: 1.0, y: heroY + 1.26, w: 10.7, h: 0.42, fontSize: 18, bold: true, color: WHITE, fontFace: HEAD_FONT,
  });
  s.addText("Google Meet 자막을 자동으로 그래프로 정리해주는 개인용 크롬 확장 프로그램입니다.", {
    x: 1.0, y: heroY + 1.72, w: 10.7, h: 0.32, fontSize: 12, color: "C7C7CC", fontFace: BODY_FONT,
  });
  s.addText("※ 이 부스는 홍보 목적으로 운영됩니다 — 서비스는 완전 무료입니다.", {
    x: 1.0, y: heroY + 2.1, w: 10.7, h: 0.3, fontSize: 10.5, italic: true, color: "8A8A8E", fontFace: BODY_FONT,
  });

  // ---- 체험 기념품 / 굿즈 (실물 판매) ----
  s.addText("체험 기념품 · 굿즈 (오프라인 실물 판매)", {
    x: 0.7, y: heroY + heroH + 0.25, w: 8, h: 0.35, fontSize: 13, bold: true, color: INK, fontFace: HEAD_FONT,
  });

  const head = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: DARK }, fontFace: HEAD_FONT, fontSize: 12, valign: "middle" } });
  const cell = (t, opts = {}) => ({ text: t, options: { color: INK, fontFace: BODY_FONT, fontSize: 11.5, valign: "middle", ...opts } });

  const rows = [
    [head("상품명"), head("가격"), head("비고")],
    [cell("마인드 그래프 레고 키링\n(체험존에서 완성한 내 마음 그래프 모양으로 제작)"), cell("4,000원", { bold: true }), cell("체험 후 제작 · 한정 수량")],
    [cell("DIY 조립형 미니 그래프 키링"), cell("3,000원", { bold: true }), cell("직접 조립 체험형")],
    [cell("AiDeep 로고 뱃지 · 스티커 세트"), cell("1,500원", { bold: true }), cell("-")],
  ];
  s.addTable(rows, {
    x: 0.7, y: heroY + heroH + 0.62, w: 11.95, colW: [7.15, 1.8, 3.0],
    border: { pt: 0.75, color: "E4E4DF" },
    autoPage: false,
    rowH: [0.42, 0.62, 0.46, 0.46],
  });

  pageNum(s, 5, false);
}

// =========================================================================
// SLIDE 6 — 부스 컨셉
// =========================================================================
{
  const s = pres.addSlide();
  bg(s, DARK);
  eyebrow(s, "Booth Concept", GREEN);
  title(s, "여러분의 머릿속을 보여드립니다.", { color: WHITE });

  s.addText("안개 낀 숲을 걸어 나와 맑아진 세상을 보듯 — 뒤엉킨 머릿속이 그래프 하나로 선명해지는 순간을, 부스에서 그대로 보여드립니다.", {
    x: 0.7, y: 1.55, w: 11.9, h: 0.7, fontSize: 13.5, color: "C7C7CC", fontFace: BODY_FONT, lineSpacingMultiple: 1.3,
  });

  const zones = [
    ["체험존", "“너의 머릿속을 보여줘” — 요즘 고민을 말하면 안개처럼 뒤엉켜 있던 생각이 기쁨 · 슬픔 · 불안 감정 노드로 걷히며, 선명한 그래프로 드러나는 체험"],
    ["이벤트존", "스피드 퍼즐 맞추기(뒤죽박죽 스토리를 제한시간 안에 정리) + 같은 내용 짝짓기(다른 문장, 같은 의미 찾기) 게임 상시 진행"],
    ["굿즈 · 포토존", "체험존에서 완성한 내 마음 그래프 모양을 본뜬 키링 제작 · 대형 그래프 배너 앞 인증샷"],
  ];
  const cw = 3.75, gap = 0.35;
  zones.forEach((z, i) => {
    const x = 0.7 + i * (cw + gap);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.55, w: cw, h: 3.6, rectRadius: 0.1, fill: { color: DARK2 }, line: { color: "38383B", width: 1 } });
    nodeMotif(s, x + 0.3, 2.9, GREEN, 1.05);
    s.addText(z[0], { x: x + 0.3, y: 3.55, w: cw - 0.6, h: 0.45, fontSize: 18, bold: true, color: GREEN, fontFace: HEAD_FONT });
    s.addText(z[1], { x: x + 0.3, y: 4.05, w: cw - 0.6, h: 1.9, fontSize: 12.5, color: "B7B7BC", fontFace: BODY_FONT, lineSpacingMultiple: 1.3 });
  });

  s.addText("동선: 입구 배너 → 체험존(마음 그래프 체험) → 이벤트존(게임 참여) → 굿즈 · 포토존(키링 제작 · 인증샷)", {
    x: 0.7, y: 6.45, w: 11.9, h: 0.5, fontSize: 12, italic: true, color: "8A8A8E", fontFace: BODY_FONT,
  });

  pageNum(s, 6, true);
}

// =========================================================================
// SLIDE 7 — 부스 구성도 & 홍보 배너 (최종 디자인)
// =========================================================================
{
  const s = pres.addSlide();
  bg(s, LIGHT);
  mistCorner(s, PW - 3.0, -1.6, 4.4);
  eyebrow(s, "Booth Layout & Signage", GREEN_DK);
  title(s, "부스 구성도 & 홍보 배너", { fontSize: 30 });

  // ---- LEFT: 부스 테이블 배치 (팀 스케치 기반) ----
  s.addText("부스 테이블 배치 (정면 기준)", {
    x: 0.7, y: 1.62, w: 7.3, h: 0.32, fontSize: 13, bold: true, color: INK, fontFace: HEAD_FONT,
  });

  const stations = [
    ["AiDeep 실시간 데모", "모니터로 서비스 직접 시연", GREEN_DK, pres.shapes.ROUNDED_RECTANGLE],
    ["체험존 · 너의 머릿속을 보여줘", "담당 팀원1 · 완료 시 스탬프 1개", GREEN, pres.shapes.OVAL],
    ["이벤트존 · 스피드 퍼즐 맞추기", "담당 팀원2 · 완료 시 스탬프 1개", GREEN, pres.shapes.OVAL],
  ];
  const colW = 2.3, colGap = 0.15, colX0 = 0.7;
  stations.forEach((st, i) => {
    const cx = colX0 + i * (colW + colGap);
    const mid = cx + colW / 2;
    s.addText(st[0], { x: cx, y: 2.02, w: colW, h: 0.48, align: "center", fontSize: 11.5, bold: true, color: INK, fontFace: HEAD_FONT });
    s.addText(st[1], { x: cx, y: 2.54, w: colW, h: 0.4, align: "center", fontSize: 9.5, color: MUTED, fontFace: BODY_FONT });
    s.addShape(st[3], { x: mid - 0.42, y: 3.12, w: 0.84, h: 0.5, fill: { color: st[2] }, line: { type: "none" } });
    s.addShape(pres.shapes.LINE, { x: mid, y: 3.62, w: 0, h: 0.53, line: { color: "B9B9B2", width: 1.25 } });
  });

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.7, y: 4.15, w: 7.3, h: 1.4, rectRadius: 0.06, fill: { color: "EDEDE6" }, line: { color: "D8D8D0", width: 1 },
  });
  s.addText("부스 테이블", { x: 0.7, y: 5.28, w: 7.3, h: 0.22, align: "center", fontSize: 9.5, color: "9A9A94", fontFace: BODY_FONT });

  s.addText("스탬프 랠리 — 체험존 · 이벤트존 각 참여 시 스탬프 1개, 2개를 모으면 그 자리에서 굿즈를 증정합니다.", {
    x: 0.7, y: 5.68, w: 7.3, h: 0.35, fontSize: 11.5, italic: true, bold: true, color: GREEN_DK, fontFace: BODY_FONT,
  });
  s.addText("현장 준비물 — 가격표 · 명함꽂이 · 잔돈통 · 스탬프 카드 · 멀티탭/보조배터리 · 우천 대비 비닐", {
    x: 0.7, y: 6.06, w: 7.3, h: 0.3, fontSize: 10, color: MUTED, fontFace: BODY_FONT,
  });

  // ---- RIGHT: 홍보 배너 (최종 디자인, 실제 Canva 제작본) ----
  s.addText("홍보 배너 (최종 디자인)", {
    x: 8.5, y: 1.62, w: 4.15, h: 0.32, fontSize: 13, bold: true, color: INK, fontFace: HEAD_FONT,
  });

  const bannerW = 2.95, bannerH = bannerW * (1697 / 1200);
  const bannerX = 8.9 + (3.35 - bannerW) / 2, bannerY = 2.02;
  s.addImage({ path: IMG("banner_final.png"), x: bannerX, y: bannerY, w: bannerW, h: bannerH });
  s.addShape(pres.shapes.RECTANGLE, {
    x: bannerX, y: bannerY, w: bannerW, h: bannerH, fill: { type: "none" }, line: { color: "D8ECE3", width: 1 },
  });

  s.addText("실제 배너 디자인 — Canva 제작 · 워터컬러 안개 컨셉", {
    x: 8.5, y: bannerY + bannerH + 0.14, w: 4.15, h: 0.3, fontSize: 9.3, italic: true, color: MUTED, fontFace: BODY_FONT,
  });
  s.addText("60×160cm X배너 기준 · 부스 입구 오른쪽, 공연 동선 쪽 배치 · QR코드는 인쇄 전 추가 예정", {
    x: 8.5, y: bannerY + bannerH + 0.42, w: 4.15, h: 0.45, fontSize: 9.3, italic: true, color: MUTED, fontFace: BODY_FONT,
  });

  pageNum(s, 7, false);
}

// =========================================================================
// SLIDE 8 — 기대효과 & 마무리 어필
// =========================================================================
{
  const s = pres.addSlide();
  bg(s, DARK);
  eyebrow(s, "Why We Should Be The Main Booth", GREEN);
  title(s, "이 페스티벌 플리마켓의 메인 부스, AiDeep이어야 하는 이유", { color: WHITE, fontSize: 25 });

  const reasons = [
    ["페스티벌의 철학과 맞닿아 있는 서비스", "쓰이지 않고 쌓이기만 하는 기록도 서버 공간과 전력을 씁니다. AiDeep은 그 기록을 구조화해 실제로 쓰이게 만들어, 방치되는 디지털 탄소를 줄입니다. SWF가 말하는 '작은 움직임이 만드는 큰 변화'를, 저희는 기록 문화에서 실천합니다."],
    ["실사용 가능한 완성 서비스", "아이디어 단계가 아닌, Chrome 웹스토어에 정식 등록되어 지금 바로 설치·체험 가능한 제품입니다."],
    ["체험 = 화제성, 그 자체로 콘텐츠", "내가 말한 고민이 인사이드 아웃처럼 감정 노드로 펼쳐지는 장면은 그 자체로 시선을 끌고, 사진 찍고 공유하고 싶은 부스입니다."],
    ["스치지 않는, 제대로 채우는 체험", "SWF가 아티스트에게 50분 이상의 무대를 내어주듯, 저희도 3~4분간 제대로 몰입하는 체험을 설계했습니다. 스쳐가는 부스가 아닌, 기억에 남는 부스가 되겠습니다."],
  ];
  const cw = 5.75, gap = 0.4;
  reasons.forEach((r, i) => {
    const x = 0.7 + (i % 2) * (cw + gap);
    const y = 1.85 + Math.floor(i / 2) * 2.05;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: 1.8, rectRadius: 0.1, fill: { color: DARK2 }, line: { color: "38383B", width: 1 } });
    s.addText(r[0], { x: x + 0.3, y: y + 0.18, w: cw - 0.6, h: 0.45, fontSize: 15.5, bold: true, color: GREEN, fontFace: HEAD_FONT });
    s.addText(r[1], { x: x + 0.3, y: y + 0.65, w: cw - 0.6, h: 1.05, fontSize: 11.5, color: "C7C7CC", fontFace: BODY_FONT, lineSpacingMultiple: 1.3 });
  });

  s.addText("작은 정리 습관 하나가 만드는 변화 — AiDeep도 이 페스티벌의 새로운 파동에 함께하고 싶습니다.", {
    x: 0.7, y: 6.15, w: 9.6, h: 0.6, fontSize: 13.5, italic: true, bold: true, color: WHITE, fontFace: BODY_FONT,
  });
  nodeMotif(s, 11.7, 6.3, GREEN, 1.3);

  pageNum(s, 8, true);
}

pres.writeFile({ fileName: path.join(__dirname, "AiDeep_플리마켓_운영계획서.pptx") }).then(() => {
  console.log("done");
});
