const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_INSTRUCTION =
  "사용자의 일기를 분석해서 감정 상태를 이모티콘과 함께 부드러운 어조로 요약해 줘. " +
  "반드시 아래 JSON 형식으로만 응답해. 다른 텍스트는 포함하지 마.";

function buildUserPrompt(date, content) {
  return `다음 일기를 분석해 주세요.

날짜: ${date}

일기 내용:
${content}

응답 JSON 형식:
{
  "dominantEmoji": "가장 두드러진 감정을 나타내는 이모지 하나",
  "emotions": [
    { "name": "감정 이름 (한국어)", "emoji": "이모지", "percentage": 0~100 사이 숫자 }
  ],
  "encouragement": "사용자에게 전하는 따뜻한 격려 문구 (2~3문장, 한국어)"
}

규칙:
- emotions 배열에는 3~5개의 감정을 포함
- percentage 합계는 100이 되도록 조정
- encouragement는 공감하고 위로하는 부드러운 말투로 작성`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const apiKey = process.env.Gemini_api_key;
  if (!apiKey) {
    return res.status(500).json({
      error: "서버에 API 키가 설정되지 않았습니다. Vercel 환경 변수에 Gemini_api_key를 등록해 주세요.",
    });
  }

  const { date, content } = req.body || {};

  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "일기 내용을 입력해 주세요." });
  }

  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "날짜를 선택해 주세요." });
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildUserPrompt(date, content.trim()) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message =
        errData?.error?.message ||
        `API 요청 실패 (상태 코드: ${response.status})`;
      return res.status(response.status).json({ error: message });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({
        error: "AI 응답을 받지 못했습니다. 다시 시도해 주세요.",
      });
    }

    const parsed = JSON.parse(text);

    if (!parsed.emotions || !Array.isArray(parsed.emotions)) {
      return res.status(502).json({
        error: "감정 분석 결과 형식이 올바르지 않습니다.",
      });
    }

    return res.status(200).json({
      dominantEmoji: parsed.dominantEmoji || parsed.emotions[0]?.emoji || "😊",
      emotions: parsed.emotions,
      encouragement:
        parsed.encouragement ||
        "오늘도 수고 많으셨어요. 당신의 감정은 소중합니다.",
    });
  } catch (err) {
    console.error("Gemini API error:", err);
    return res.status(500).json({
      error: err.message || "감정 분석 중 오류가 발생했습니다.",
    });
  }
}
