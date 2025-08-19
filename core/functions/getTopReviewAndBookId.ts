import { getConnection } from "../../backend/db/oracle.ts";
import oracledb from "oracledb";

// 가장 최근의 감상문과 해당 책 ID를 가져오는 함수
export async function getTopReviewAndBookId(): Promise<{ review: string; baseBookId: string }> {

  const conn = await getConnection();

  try {
    const result = await conn.execute(
      `
      SELECT rp.content AS review, TO_CHAR(rp.book_id) AS book_id
      FROM reading_log rp
      WHERE LENGTH(rp.content) > 5
      ORDER BY rp.log_date DESC
      FETCH FIRST 1 ROWS ONLY
      `,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row = result.rows?.[0] as { REVIEW?: any; BOOK_ID?: string };

    if (!row || !row.BOOK_ID || !row.REVIEW) {
      throw new Error("❌ 충분한 감상문이 없거나 책 ID를 찾지 못함");
    }

    const reviewLob = row.REVIEW;

    const reviewText = await new Promise<string>((resolve, reject) => {
      let text = "";
      reviewLob.setEncoding("utf8");
      reviewLob.on("data", (chunk: string) => (text += chunk));
      reviewLob.on("end", () => resolve(text));
      reviewLob.on("error", reject);
    });

    return {
      review: reviewText,
      baseBookId: row.BOOK_ID,
    };

  } finally {
    await conn.close();
  }
}