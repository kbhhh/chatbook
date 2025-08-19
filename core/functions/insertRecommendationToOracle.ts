import { v4 as uuidv4 } from "uuid";
import { Client } from "@notionhq/client";
import { getConnection } from "../../backend/db/oracle.ts";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const RECOMMENDED_BOOK_DB_ID = process.env.RECOMMENDED_BOOK_DB_ID;

if (!RECOMMENDED_BOOK_DB_ID) {
  throw new Error("❌ RECOMMENDED_BOOK_DB_ID 환경 변수가 설정되지 않았습니다.");
}

interface RecommendationEntry {
  baseBookId: string;
  recommendedBookId: string;
  recommendedBookTitle: string;
  recommendedReason: string;
  imageUrl?: string;
}

// 추천 이유를 안전하게 문자열로 변환하는 함수
function getSafeReason(reason: any): string {
  if (typeof reason === "string") {
    return reason.trim();
  } else if (typeof reason === "object" && reason?.text) {
    return String(reason.text).trim();
  } else {
    return JSON.stringify(reason ?? "").trim();
  }
}

// 추천 도서를 Oracle과 Notion에 저장하는 함수
export async function insertRecommendationToOracle(
  entries: RecommendationEntry[]
): Promise<void> {
  let conn;

  try {
    conn = await getConnection();

    const insertSql = `
      INSERT INTO recommendation (
        base_book_id,
        recommended_book_id,
        recommended_book_title,
        recommended_reason,
        created_at
      )
      VALUES (
        :base_book_id,
        :recommended_book_id,
        :recommended_book_title,
        :recommended_reason,
        SYSTIMESTAMP
      )
    `;

    for (const entry of entries) {
      const binds = {
        base_book_id: entry.baseBookId,

        recommended_book_id: entry.recommendedBookId || uuidv4(),

        recommended_book_title: entry.recommendedBookTitle,

        recommended_reason: getSafeReason(entry.recommendedReason),
      };

      const result = await conn.execute(insertSql, binds, { autoCommit: true });

    }

    for (const entry of entries) {
      const title = entry.recommendedBookTitle ?? "제목 없음";

      const reason = getSafeReason(entry.recommendedReason);

      const imageUrl = entry.imageUrl ?? "";

      try {
        await notion.pages.create({
          parent: { database_id: RECOMMENDED_BOOK_DB_ID! },
          properties: {
            이름: {
              title: [{ text: { content: title } }],
            },
            추천이유: {
              rich_text: [{ type: "text", text: { content: reason } }],
            },
          },
          ...(imageUrl && imageUrl.startsWith("http") && {
            cover: {
              external: { url: imageUrl },
            },
          }),
        });

      } catch (err) {
        console.error(`❌ Notion 저장 실패 (${title}):`, err);
      }
    }
  } catch (err: any) {
    console.error("❌ 전체 실패:", err.message || err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}
