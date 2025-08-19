import oracledb, { getConnection } from "../../backend/db/oracle.ts";

// 책 제목으로 오라클에 저장된 독서 계획 정보를 조회하는 함수
export async function getReadingPlanWithBookInfoByTitle(title: string) {
  let conn;
  try {
    conn = await getConnection();

    const result = await conn.execute(
      `
      SELECT
        r.book_id,
        r.start_date,
        r.end_date,
        r.interval_days,
        b.title,
        b.author,
        b.total_pages
      FROM reading_plan r
      JOIN book_info b ON r.book_id = b.book_id
      WHERE REPLACE(b.title, ' ', '') = REPLACE(:title, ' ', '')
      ORDER BY r.id DESC FETCH FIRST 1 ROWS ONLY
      `,
      [title],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows?.[0] || null;

  } finally {
    if (conn) await conn.close();
  }
}
