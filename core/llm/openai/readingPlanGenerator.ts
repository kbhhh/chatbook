import { askOpenAIJson } from "../../utils/openaiClient.ts";


// 독서 계획 생성
export async function generateReadingPlan(text: string) {
  const prompt = `
다음 텍스트를 분석하여 독서 계획을 생성하세요.
출력 형식:
{
  "title": "책 제목",
  "days": [
    "1일차 계획",
    "2일차 계획",
    ...
  ]
}
텍스트:
${text}
  `;
  return await askOpenAIJson(prompt);
}
