import { getConnection } from "../../backend/db/oracle.ts";
import oracledb from "oracledb";

// 독서 기록을 입력하기 위한 데이터 구조
export interface ReadingLogInput {
  bookId: string;         
  userName?: string;      
  content: string;        
  page: number;           
  isFinal?: number;       
}

// 독서 기록을 oracle에 저장하는 함수
export async function insertReadingLog({
  bookId,
  content,
  page,
  isFinal = 1,
}: ReadingLogInput): Promise<void> {

  let conn;

  try {
    const parsedPage = Number(page);

    if (isNaN(parsedPage) || parsedPage <= 0) {
      throw new Error(` page 값이 유효하지 않습니다: ${page}`);
    }

    conn = await getConnection();

    const bookRes = await conn.execute(
      `SELECT COUNT(*) AS CNT FROM BOOK_INFO WHERE book_id = :bookId`,
      [bookId],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )

    const bookExists = (bookRes.rows?.[0] as any)?.CNT > 0;

    if (!bookExists) {
      throw new Error(` BOOK_INFO에 book_id '${bookId}' 가 존재하지 않습니다.`);
    }

    const finalIsFinal = isFinal ? 1 : 0;

    await conn.execute(
      `
      INSERT INTO READING_LOG (book_id, page, content, is_final)
      VALUES (:book_id, :page, :content, :is_final)
      `,
      {
        book_id: String(bookId),
        page: parsedPage,
        content,
        is_final: finalIsFinal,
      },
      { autoCommit: true }
    );

  } catch (err) {
    console.error("❌ insertReadingLog 실패:", err);
    throw err;
  } finally {
    if (conn) await conn.close().catch(console.error);
  }
}
