import { getRecommendedBooksByReview } from "../llm/openai/bookAnalysis.ts";
import { uploadImageToCloud } from "../notion/notionUtils.ts";
import { searchBook } from "../functions/registerBook.ts";
import { Client, PageObjectResponse } from "@notionhq/client";
import { insertRecommendationToOracle } from "./insertRecommendationToOracle.ts";
import { getTopReviewAndBookId } from "./getTopReviewAndBookId.ts";
import { v4 as uuidv4 } from "uuid";
import oracledb from "oracledb";
import dotenv from "dotenv";
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const RECOMMENDED_DB_ID = process.env.RECOMMENDED_BOOK_DB_ID!;

// OpenAI 추천 기반으로 신규 도서를 Oracle저장 및 참조하여 Notion에 등록하는 함수
export const handleRecommendBooks = async (
  { userId }: { userId: string }
): Promise<{ books: { title: string; reason: string }[] }> => {

  const { review, baseBookId } = await getTopReviewAndBookId();

  const recommended = await getRecommendedBooksByReview(review);

  const existingRecommended = await getExistingRecommendedTitles();

  const userLibrary = await getUserLibraryTitles();

  const toRegister: { title: string; reason: string; imageUrl: string }[] = [];

  for (const entry of recommended?.recommendations || []) {
    const rawTitle = typeof entry === "string" ? entry : entry.title;

    const title = rawTitle.trim();

    let imageUrl = entry.imageUrl ?? "";

    if (!imageUrl || imageUrl.includes("placeholder")) {
      try {
        const book = await searchBook(title);
        imageUrl = book.책표지 || "";
        if (!imageUrl) {
          console.warn(`썸네일 없음 - 추천에서 제외: ${title}`);
          continue;
        }
      } catch {
        console.warn(`썸네일 에러 - 추천에서 제외: ${title}`);
        continue;
      }
    }

    let reason = "";

    if (typeof entry.reason === "string") {
      reason = entry.reason.trim();
    } else if (typeof entry.reason === "object" && (entry.reason as any).text) {
      reason = String((entry.reason as any).text).trim();
    } else if (!entry.reason) {
      reason = "리뷰와 유사한 장르의 도서";
    } else {
      reason = JSON.stringify(entry.reason ?? "").trim();
    }

    const normalized = normalizeTitle(title);

    if (existingRecommended.has(normalized)) continue;

    if (userLibrary.has(normalized)) continue;

    toRegister.push({ title, reason, imageUrl });
  }

  if (toRegister.length === 0) {
    console.warn("⚠️ 신규 추천 도서가 없으므로 기존 데이터 삭제 및 등록을 건너뜁니다.");
    return { books: [] };
  }
  await deleteAllRecommendedBooks();

  const savedBooks: { title: string; reason: string }[] = [];

  for (const entry of toRegister) {
    let finalImageUrl = "";

    try {
      finalImageUrl = await uploadImageToCloud(entry.imageUrl, entry.title);
    } catch {
      finalImageUrl = entry.imageUrl;
    }

    const recommendedBookId = uuidv4();

    await insertRecommendationToOracle([
      {
        baseBookId,
        recommendedBookId,
        recommendedBookTitle: entry.title,
        recommendedReason: entry.reason,
        imageUrl: finalImageUrl,
      },
    ]);

    savedBooks.push({ title: entry.title, reason: entry.reason });
  }

  return { books: savedBooks };
};


// 감상문 입력에서 문자열 텍스트만 추출
export function extractReviewText(prompt: any): string {
  if (typeof prompt === "string") return prompt;
  if (typeof prompt === "object") {
    return prompt.content || prompt.text || JSON.stringify(prompt);
  }
  return String(prompt);
}

// 책 제목을 소문자, 공백, 괄호 제거 등으로 표준화
export function normalizeTitle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/:.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Notion에서 기존 추천 도서 제목들을 조회하여 Set으로 반환
export async function getExistingRecommendedTitles(): Promise<Set<string>> {
  const response = await notion.databases.query({ database_id: RECOMMENDED_DB_ID });

  const titles = new Set<string>();
  for (const page of response.results) {
    const fullPage = page as PageObjectResponse;
    if ("properties" in fullPage && fullPage.properties["이름"]?.type === "title") {
      const raw = fullPage.properties["이름"]?.title?.[0]?.plain_text;
      if (raw) {
        const normalized = normalizeTitle(raw);
        titles.add(normalized);
      }
    }
  }
  return titles;
}

// Notion과 Oracle에서 기존 추천 도서 삭제
export async function deleteAllRecommendedBooks(): Promise<void> {

  const { results } = await notion.databases.query({ database_id: RECOMMENDED_DB_ID });

  for (const page of results) {
    if ("id" in page) {
      await notion.pages.update({
        page_id: page.id,
        archived: true,
      });
    }
  }

  let conn;

  try {
    oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_PATH });
    conn = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PW,
      connectString: process.env.ORACLE_CONNECT,
      walletLocation: process.env.ORACLE_WALLET_PATH,
    });

    const deleteSql = `DELETE FROM recommendation`;

    const result = await conn.execute(deleteSql, [], { autoCommit: true });

  } catch (err) {
    console.error("❌ Oracle 추천도서 삭제 실패:", err);
  } finally {
    if (conn) await conn.close();
  }
}


// 사용자 서재 제목 조회
export async function getUserLibraryTitles(): Promise<Set<string>> {

  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  const databaseId = process.env.NOTION_DATABASE_ID!;

  const { results } = await notion.databases.query({ database_id: databaseId });

  const titles = new Set<string>();

  for (const page of results) {
    if ("properties" in page && page.properties["이름"]?.type === "title") {
      const title = page.properties["이름"].title?.[0]?.plain_text;
      if (title) {
        titles.add(title.trim().toLowerCase());
      }
    }
  }
  return titles;
}
