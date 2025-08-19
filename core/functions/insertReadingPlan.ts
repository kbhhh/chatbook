import { getConnection } from "../../backend/db/oracle.ts";

// 독서 계획을 oracle에 저장하는 함수
export async function insertReadingPlan({
  bookId,
  startDate,
  endDate,
  intervalDays
}: {
  bookId: string;
  startDate: string;
  endDate: string;
  intervalDays: number;
}) {

  let conn;
  try {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      throw new Error(`잘못된 날짜 형식: startDate=${startDate}, endDate=${endDate}`);
    }

    if (new Date(startDate) > new Date(endDate)) {
      throw new Error(`시작일이 종료일보다 늦습니다: ${startDate} > ${endDate}`);
    }

    conn = await getConnection();

    const result = await conn.execute(
      `
      INSERT INTO reading_plan (book_id, start_date, end_date, interval_days)
      VALUES (:book_id, TO_DATE(:start_date, 'YYYY-MM-DD'), TO_DATE(:end_date, 'YYYY-MM-DD'), :interval_days)
      `,
      {
        book_id: String(bookId),
        start_date: startDate,
        end_date: endDate,
        interval_days: intervalDays
      },
      { autoCommit: true }
    );

    return result;
  } catch (err) {
    console.error("❌ Oracle에 독서 계획 저장 실패:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}
