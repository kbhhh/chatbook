import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

import { createAgent } from "./agentica/agent.ts";

// Agentica 초기화
let agent: any;

try {
  agent = createAgent();

  console.log("Agentica 초기화 완료");
} catch (e) {
  console.error("Agentica 초기화 실패:", e);

  process.exit(1);
}

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));

app.use(express.json());

// Agentica 실행 결과 정리
function pickResult(prompts: any[]) {
  const lastExec = [...prompts].reverse().find((p) => p.type === "execute");

  const lastDesc = [...prompts].reverse().find((p) => p.type === "describe");

  return {
    operation: lastExec?.operation?.name ?? null,
    args: lastExec?.arguments ?? null,
    value: lastExec?.value ?? null,
    summary: lastDesc?.text ?? null,
    prompts: prompts.map((p: any) => p.toJSON?.() ?? p),
  };
}

// Agentica 실행 함수 + 로그
async function runAgent(prompt: string) {
  console.log("\n=======================");

  console.log(" Agentica 호출 시작");

  console.log(" 사용자 입력:", prompt);

  const prompts = await agent.conversate(prompt);

  const result = pickResult(prompts);

  console.log(" Agentica 실행 결과");
  console.log("   - 호출된 함수:", result.operation || "(없음)");
  console.log("   - 전달된 인자:", result.args || "(없음)");
  console.log("   - 함수 반환값:", result.value || "(없음)");
  console.log("=======================\n");

  return result;
}

// 라우트

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/agent/chat", async (req, res) => {
  try {
    const { prompt } = req.body ?? {};

    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    res.json(await runAgent(prompt));

  } catch (e: any) {

    console.error("❌ /agent/chat:", e);

    res.status(500).json({ error: e.message || "Agentica error" });

  }
});

app.post("/add-book", async (req, res) => {
  try {

    res.json(await runAgent(req.body.prompt ?? ""));

  } catch (e: any) {

    console.error("❌ /add-book:", e);

    res.status(500).json({ error: e.message || "처리 실패" });

  }
});

app.post("/update-book", async (req, res) => {
  try {

    res.json(await runAgent(req.body.userInput ?? ""));

  } catch (e: any) {

    console.error("❌ /update-book:", e);

    res.status(500).json({ error: e.message || "감상 저장 실패" });
  }
});

app.post("/update-progress", async (req, res) => {
  try {
    const { bookName, page } = req.body;

    const result = await runAgent(`"${bookName}" 책 ${page}쪽까지 읽었어`);

    res.json(result);

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/reading-plan", async (req, res) => {
  try {

    res.json(await runAgent(req.body.message ?? ""));

  } catch (e: any) {

    console.error("❌ /reading-plan:", e);

    res.status(500).json({ error: e.message || "서버 오류 발생" });
  }
});

app.post("/recommend-books", async (req, res) => {
  try {

    const review = req.body.review ?? "";

    const prompt = `아래 감상문을 분석해서 추천도서를 등록해줘:\n---\n${review}\n---`;

    res.json(await runAgent(prompt));

  } catch (e: any) {
    console.error("❌ /recommend-books:", e);

    res.status(500).json({ error: e.message || "추천 도서 등록 실패" });
  }
});

// 에러 로깅
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// 서버 시작
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
