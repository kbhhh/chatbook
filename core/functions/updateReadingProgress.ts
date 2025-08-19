import  { getConnection } from "../../backend/db/oracle.ts";
import { findPageIdByBookName, updateBookProperties } from "../notion/notionUtils.ts";

// Oracle에서 참조하여 Notion에 책갈피 상황을 동기화하고 저장 결과 반환
export async function updateReadingProgressAndSync({
  bookName,
  page,
}: {
  bookName: string;
  page: number;
}) {

  let conn;

  try {
    conn = await getConnection();

    const findBookSql = `SELECT book_id FROM book_info WHERE title = :title`;

    const bookResult = await conn.execute(findBookSql, { title: bookName });

    const bookId = bookResult.rows?.[0]?.[0];

    if (!bookId) {
      throw new Error(`Oracle에 "${bookName}" 책이 없습니다.`);
    }

    const updateSql = `
      MERGE INTO reading_progress rp
      USING (SELECT :bookId AS book_id FROM dual) input
      ON (rp.book_id = input.book_id)
      WHEN MATCHED THEN
        UPDATE SET current_page = :page, updated_at = SYSDATE
      WHEN NOT MATCHED THEN
        INSERT (book_id, current_page, updated_at, created_at)
        VALUES (:bookId, :page, SYSDATE, SYSDATE)
    `;
    await conn.execute(updateSql, { bookId, page }, { autoCommit: true });

    const notionPageId = await findPageIdByBookName(bookName);

    if (!notionPageId) {
      throw new Error(`Notion에서 "${bookName}" 책 페이지를 찾을 수 없습니다.`);
    }

    const updatePayload = { 책갈피: `${page}쪽` };

    const notionRes = await updateBookProperties(notionPageId, updatePayload);

    return {
      message: `📘 Oracle + Notion 책갈피 ${page}쪽 저장 완료`,
      notionRes,
    };
  } catch (err) {
    console.error("❌ 책갈피 업데이트 실패:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}
