# AI 감정 일기장 🌸

Gemini API로 하루의 감정을 분석해 주는 웹 기반 일기장입니다.

## API 키는 어디에 넣나요?

**`script.js`에 API 키를 넣지 마세요.** 브라우저 코드는 누구나 볼 수 있고, GitHub에 올리면 키가 그대로 노출됩니다.

대신 **Vercel 서버 환경 변수**에만 저장합니다. 서버(`api/analyze.js`)가 Gemini를 대신 호출합니다.

```
브라우저 (script.js)  →  /api/analyze (Vercel 서버)  →  Gemini API
                              ↑
                    Gemini_api_key (환경 변수, 비공개)
```

## 시작하기

### 1. API 키 발급

1. [Google AI Studio](https://aistudio.google.com/apikey) 에 접속합니다.
2. **Create API Key** 를 클릭해 API 키를 발급받습니다.

### 2. 로컬에서 테스트 (선택)

로컬에서도 API를 쓰려면 Vercel CLI가 필요합니다.

```bash
# Vercel CLI 설치 (최초 1회)
npm i -g vercel

# 프로젝트 폴더에서
cp .env.example .env
# .env 파일을 열어 Gemini_api_key 값을 입력

vercel dev
```

브라우저에서 `http://localhost:3000` 으로 접속합니다.

> `index.html`을 파일로 직접 열면 `/api/analyze`가 동작하지 않습니다. 반드시 `vercel dev` 또는 배포된 URL을 사용하세요.

## GitHub + Vercel 배포

### GitHub에 올리기

```bash
git init
git add .
git commit -m "AI 감정 일기장 초기 버전"
git branch -M main
git remote add origin https://github.com/사용자명/저장소이름.git
git push -u origin main
```

`.env` 파일은 `.gitignore`에 포함되어 있어 **자동으로 제외**됩니다.

### Vercel 배포 + API 키 등록

1. [vercel.com](https://vercel.com) 에 로그인합니다.
2. **Add New Project** → GitHub 저장소를 선택합니다.
3. Framework Preset은 **Other** (정적 사이트)로 둡니다.
4. **Environment Variables** 섹션에서 아래를 추가합니다.

| Name | Value |
|------|-------|
| `Gemini_api_key` | Google AI Studio에서 발급받은 키 |

5. **Deploy** 를 클릭합니다.

이미 배포한 뒤 키를 추가했다면: Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables** → 추가 후 **Redeploy** 하세요.

## 파일 구조

```
├── api/
│   └── analyze.js   # 서버 API (Gemini 호출, API 키 보관)
├── index.html       # 화면 구조
├── style.css        # 디자인
├── script.js        # 화면 동작 (API 키 없음)
├── .env.example     # 로컬용 환경 변수 예시
├── .gitignore       # .env 등 제외 목록
└── README.md
```

## 주요 기능

- 날짜 선택 + 일기 작성
- Gemini 2.5 Flash 감정 분석 (이모지 + 퍼센트 + 격려 문구)
- Local Storage에 일기 저장
- 리스트 / 달력 보기 전환
- 월간 감정 요약 (이모지 칩)
- 일기 상세 보기 및 삭제
