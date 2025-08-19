import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../backend/.env"),
});

if (!process.env.OPENAI_API_KEY) {
  console.error("현재 __dirname:", __dirname);
  console.error("시도한 .env 경로:", path.resolve(__dirname, "../..", ".env"));
  throw new Error("❌ OPENAI_API_KEY가 .env에서 로드되지 않았습니다.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 자유 텍스트 응답
export async function askOpenAI(userPrompt: string, model = "gpt-4o-mini") {

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.7,
    });

    return completion.choices[0].message?.content?.trim() || "";

  } catch (error) {
    console.error("❌ OpenAI 호출 실패:", error);
    return "";
  }
}

// JSON 응답 보장
export async function askOpenAIJson<T = any>(
  userPrompt: string,
  model = "gpt-4o-mini"
): Promise<T | null> {
  try {

    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: `다음 요청에 대한 응답을 JSON 형식으로 반환해줘. ${userPrompt}`,
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0].message?.content || "{}";

    return JSON.parse(content) as T;
  } catch (error) {
    console.error("❌ OpenAI JSON 호출 실패:", error);
    
    if (error instanceof OpenAI.APIError) {
      console.error("오류 상세 정보:", error.status, error.name, error.message);
    }
    return null;
  }
}