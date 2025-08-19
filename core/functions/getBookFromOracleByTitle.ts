import oracledb, { getConnection } from "../../backend/db/oracle.ts";

export interface Book {
  id: string;
   bookId: string;
  이름: string;
  저자: string;
  책표지: string | null;
  장르?: string;
  "총 페이지"?: number;
  "처음 읽은 날"?: string;
}

// 제목으로 Oracle DB에서 책 정보를 조회하는 함수
export async function getBookFromOracleByTitle(title: string): Promise<Book | null> {
  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT id,book_id, title, author, cover_url, genre, total_pages, created_at
      FROM BOOK_INFO
      WHERE title = :title
      `,
      [title],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!result.rows || result.rows.length === 0) return null;

    const row = result.rows[0] as any;

    const book: Book = {
       bookId: row.BOOK_ID,
       id: row.ID,
      이름: row.TITLE,
      저자: row.AUTHOR,
      책표지: row.COVER_URL,
      장르: row.GENRE || undefined,
      "총 페이지": row.TOTAL_PAGES || undefined,
      "처음 읽은 날": row.CREATED_AT?.toISOString().slice(0, 10),
    };

    return book;

  } catch (err) {
    console.error("❌ Oracle 책 정보 조회 실패:", err);
    return null;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("❌ Oracle 연결 종료 실패:", err);
      }
    }
  }
}
