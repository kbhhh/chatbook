import { Client } from "@notionhq/client";
import { v2 as cloudinary } from "cloudinary";
import "../utils/env.ts";
import { extractReviewText } from "../functions/recommendBook.ts";
import { getConnection } from "../../backend/db/oracle.ts";
import oracledb from "oracledb";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const databaseId = process.env.NOTION_DATABASE_ID!;

const reviewDbId = process.env.NOTION_READDATABASE_ID!;


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 책 이름으로 Notion 페이지 ID 조회
export async function findPageIdByBookName(bookName: string): Promise<string | null> {

  const res = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "이름",
      rich_text: {
        equals: bookName,
      },
    },
  });

  const page = res.results[0];

  return page ? page.id : null;
}

// 이미지 파일을 Cloudinary에 업로드하고 URL 반환
export async function uploadImageToCloud(localPath: string, title: string): Promise<string> {

  if (localPath.includes("??")) {
    localPath = localPath.replace("??", "?");
  }

  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder: "your-folder-name",
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      secure: true,
    });
    return result.secure_url;
  } catch (error) {
    console.error("❌ Cloudinary 업로드 실패:", error);
    throw error;
  }
}

export interface Book {
  이름: string;
  저자: string;
  책표지: string | null;
  "도서 기록"?: string;
  상태?: string;
  진행률?: number;
  장르?: string;
  "책갈피"?: string;
  "총 페이지"?: number;
  "처음 읽은 날"?: string;
}


export const getTodayISODate = (): string => {
  return new Date().toISOString().slice(0, 10);
};

// 오라클 CLOB 데이터를 문자열로 변환
function readCLOB(clob: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    clob.setEncoding("utf8");
    clob.on("data", (chunk: string) => (data += chunk));
    clob.on("end", () => resolve(data));
    clob.on("error", reject);
  });
}

// 오라클 감상문 데이터를 참조하여 Notion에 리뷰 페이지 생성
export async function createReviewPage(
  bookPageId: string,           
  reviewText: string,          
  readPageNumber?: number       
) {

  let conn;

  try {

    const page = (await notion.pages.retrieve({ page_id: bookPageId })) as any;

    let title = "";

    for (const key of Object.keys(page.properties || {})) {

      const prop = page.properties[key];

      if (prop?.type === "title" && Array.isArray(prop.title) && prop.title.length > 0) {
        title = prop.title.map((t: any) => t.plain_text || t.text?.content || "").join("").trim();
        if (title) break;
      }
    }
    if (!title) {
      throw new Error("Notion 책 페이지에서 제목을 찾을 수 없습니다.");
    }

    conn = await getConnection();

    const sql = `
      SELECT rl.page AS PAGE, rl.content AS CONTENT, rl.is_final AS IS_FINAL
      FROM READING_LOG rl
      JOIN BOOK_INFO b ON b.book_id = rl.book_id
      WHERE b.title = :title
      ORDER BY rl.is_final DESC, rl.page DESC
      FETCH FIRST 1 ROWS ONLY
    `;
    const rs = await conn.execute(sql, { title }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    let oracleContent: string | undefined;
    let oraclePage: number | undefined;

    const row = rs.rows?.[0] as any;
    if (row) {
      if (typeof row.CONTENT === "object" && row.CONTENT?.on) {

        oracleContent = await readCLOB(row.CONTENT);
      } else {
        oracleContent = row.CONTENT != null ? String(row.CONTENT) : undefined;
      }
      oraclePage = row.PAGE != null ? Number(row.PAGE) : undefined;
    }

    const finalReview = (oracleContent && oracleContent.trim().length > 0)
      ? oracleContent.trim()
      : (reviewText ?? "").trim();

    const finalPage = (oraclePage != null && !isNaN(oraclePage))
      ? oraclePage
      : (readPageNumber != null ? Number(readPageNumber) : undefined);

    if (!finalReview) {
      throw new Error("사용할 감상문이 없습니다. (오라클/인자 모두 비어 있음)");
    }

    const properties: Record<string, any> = {
      기록: { title: [{ text: { content: finalReview.slice(0, 100) } }] },
      감상일: { date: { start: new Date().toISOString().slice(0, 10) } },
      책장: { relation: [{ id: bookPageId }] }, 
    };

    if (finalPage !== undefined && !isNaN(finalPage)) {
      properties["기록 페이지"] = { number: Number(finalPage) };
    }

    const newPage = await notion.pages.create({
      parent: { database_id: reviewDbId },
      properties,
    });

    return newPage.id;
  } catch (err) {
    console.error("❌ createReviewPage(오라클 참조) 실패:", err);
    throw err;
  } finally {
    if (conn) await conn.close().catch(console.error);
  }
}


// 책 속성 업데이트 함수
export const updateBookProperties = async (pageId: string, updates: Record<string, any>) => {
  const properties: Record<string, any> = {};

  if (updates["상태"]) {
    properties["상태"] = { select: { name: updates["상태"] } };
  }
  if (updates["진행률"] !== undefined) {
    properties["진행률"] = { number: updates["진행률"] };
  }
  if (updates["책갈피"]) {
    properties["책갈피"] = { rich_text: [{ text: { content: updates["책갈피"] } }] };
  }
  if (updates["장르"]) {
    properties["장르"] = { rich_text: [{ text: { content: updates["장르"] } }] };
  }
  if (updates["총 페이지"] !== undefined) {
    properties["총 페이지"] = { number: updates["총 페이지"] };
  }

  if (updates["도서 기록"] && typeof updates["도서 기록"] === "string") {
    let reviewText = updates["도서 기록"];

    const pageMatch = reviewText.match(/(\d+)\s*(쪽|페이지)/);
    const parsedPage = pageMatch ? Number(pageMatch[1]) : undefined;

    if (parsedPage) {
      updates["책갈피"] = `${parsedPage}쪽`;
      properties["책갈피"] = {
        rich_text: [{ text: { content: updates["책갈피"] } }],
      };

      if (!reviewText.startsWith(`${parsedPage}쪽`)) {
        reviewText = `${parsedPage}쪽: ${reviewText}`;
      }
    }

    try {
      const reviewPageId = await createReviewPage(pageId, reviewText, parsedPage);

      properties["도서 기록"] = {
        relation: [{ id: reviewPageId }],
      };
    } catch (err) {
      console.error("도서 기록 페이지 생성 실패:", err);
    }
  }

  return await notion.pages.update({
    page_id: pageId,
    archived: false,
    properties,
  });
};

export interface ReadingPlan {
  title: string;
  author: string;
  total_pages: number;
  days: number;
  start_date: string; 
  end_date: string;  
  bookPageId?: string;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

// Notion 캘린더에 독서 일정 생성
export async function createReadingScheduleInNotion(plan: ReadingPlan) {

  if (!process.env.NOTION_CALENDAR_DB_ID) {
    throw new Error("❌ NOTION_CALENDAR_DB_ID가 .env에 정의되어 있지 않습니다.");
  }
  const calendarDbId = process.env.NOTION_CALENDAR_DB_ID;

  const response = await notion.databases.retrieve({ database_id: calendarDbId });

  let { title, author, total_pages, days, start_date, end_date } = plan;

  let conn: any;
  try {
    conn = await getConnection();

    const rs = await conn.execute(
  `
  SELECT
    bi.title        AS TITLE,
    bi.author       AS AUTHOR,
    bi.total_pages  AS TOTAL_PAGES,
    TO_CHAR(rp.start_date,'YYYY-MM-DD') AS START_YMD,
    TO_CHAR(rp.end_date,'YYYY-MM-DD')   AS END_YMD
  FROM reading_plan rp
  JOIN book_info bi ON bi.book_id = rp.book_id
  WHERE bi.title = :title
  ORDER BY rp.start_date DESC, rp.end_date DESC
  FETCH FIRST 1 ROWS ONLY
  `,
  { title },
  { outFormat: oracledb.OUT_FORMAT_OBJECT }
);

    const row = rs.rows?.[0] as any;

    if (row) {
      title       = row.TITLE ?? title;

      author      = row.AUTHOR ?? author;

      total_pages = Number(row.TOTAL_PAGES ?? total_pages);

      const startYmd = row.START_YMD ?? start_date;

      const endYmd   = row.END_YMD   ?? end_date;

      const s = new Date(`${startYmd}T00:00:00Z`);

      const e = new Date(`${endYmd}T00:00:00Z`);

      const diffDays =
        Math.floor(
          (Date.UTC(e.getFullYear(), e.getMonth(), e.getDate()) -
            Date.UTC(s.getFullYear(), s.getMonth(), s.getDate())) /
            86400000
        ) + 1;

      start_date = startYmd;

      end_date   = endYmd;

      days       = Number.isFinite(diffDays) && diffDays > 0 ? diffDays : days;

    } else {
      console.warn(`⚠️ Oracle에서 제목 "${title}" 최신 계획을 찾지 못해 전달된 plan 사용`);
    }
  } catch (e) {
    console.warn("⚠️ Oracle 조회 실패, 전달된 plan 사용:", e);
  } finally {
    if (conn) await conn.close().catch(() => {});
  }

  const bookPageId = await findBookPageIdByTitle(title);

  if (!Number.isFinite(days) || days <= 0) {
    throw new Error(`days 계산 결과가 올바르지 않습니다: ${days}`);
  }

  const pagesPerDay = Math.ceil(total_pages / days);

  const promises: Promise<any>[] = [];

  for (let i = 0; i < days; i++) {
    const currentDate = addDays(start_date, i); 

    let endPage = (i + 1) * pagesPerDay;

    if (endPage > total_pages) endPage = total_pages;

    const pageTitle = `${i + 1}일차`;

    const properties: any = {
      이름: { title: [{ text: { content: pageTitle } }] },
      "완독 목표일": { date: { start: end_date } },
      저자: author
        ? { rich_text: [{ text: { content: String(author) } }] }
        : { rich_text: [] },
      "독서 목표일": { date: { start: currentDate } },
      총페이지: { number: total_pages },
      페이지: { number: endPage }, // 누적 페이지
    };

    if (bookPageId) {
      properties["책장"] = { relation: [{ id: bookPageId }] };
    }

    promises.push(
      notion.pages.create({
        parent: { database_id: calendarDbId },
        properties,
      })
    );
  }

  await Promise.all(promises);
}



// 책 제목으로 책장에서 page_id 찾기
export async function findBookPageIdByTitle(title: string): Promise<string | null> {

  if (!process.env.NOTION_DATABASE_ID) {
    throw new Error("❌ NOTION_DATABASE_ID가 .env에 정의되어 있지 않습니다.");
  }

  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      property: "이름",
      title: {
        equals: title
      }
    }
  });

  return response.results[0]?.id ?? null;
}


