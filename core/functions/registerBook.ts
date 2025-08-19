import "../utils/env.ts";
import axios from "axios";
import { Client } from "@notionhq/client";
import FormData from "form-data";
import { getTodayISODate } from "../notion/notionUtils.ts";
import { getBookTitleFromText } from "../llm/openai/bookAnalysis.ts";
import { getConnection } from "../../backend/db/oracle.ts";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Cloudinary에 원격 이미지 URL을 업로드하고 https URL 반환
async function uploadImageUrlToCloudinary(imageUrl: string): Promise<string> {

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;

  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET!;

  const form = new FormData();

  form.append("file", imageUrl);

  form.append("upload_preset", uploadPreset);

  form.append("secure", "true");

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    form,
    { headers: form.getHeaders() }
  );

  const secureUrl = response.data.secure_url;

  if (!secureUrl.startsWith("https://")) {
    throw new Error("❌ secure_url이 https로 시작하지 않습니다.");
  }

  return secureUrl;

}

export interface Book {
  이름: string;
  저자: string;
  책표지: string | null;
  출판사?: string;
  장르?: string;
  isbn?: string;
  출판일?: string;
  줄거리?: string;
  "총 페이지"?: number;
  "처음 읽은 날"?: string;
  "도서 기록"?: string;
  상태?: string;
  진행률?: number;
  "책갈피"?: string;
}

interface BookInfo {
  title: string;
  author: string;
  publisher?: string;
  genre?: string;
  coverUrl: string;
  totalPages?: number;
  isbn?: string;
  publishDate?: Date;
  description?: string;
}

// Book 타입을 BookInfo 타입으로 변환 
export function convertBookToBookInfo(book: Book): BookInfo {
  const rawPages = book["총 페이지"];
  const parsedPages = rawPages
    ? Number(String(rawPages).replace(/[^\d]/g, ""))
    : undefined;

  return {
    title: book.이름,
    author: book.저자,
    coverUrl: book.책표지 || undefined,
    totalPages: isNaN(parsedPages) ? undefined : parsedPages,
    publisher: book.출판사 || undefined,
    genre: book.장르 || undefined,
    isbn: book.isbn || undefined,
    publishDate: book.출판일 ? new Date(book.출판일) : undefined,
    description: book.줄거리 || undefined,
  };
}

// 구글 북스 API로 도서 정보 가져오기 + Cloudinary 썸네일 업로드
export const searchBook = async (prompt: string): Promise<Book> => {

  const titleData = await getBookTitleFromText(prompt);

  const title = titleData?.main_title || "";

  const author = titleData?.author || "";

  if (!title) throw new Error("AI가 책 제목을 추출하지 못했습니다.");

  const searchQuery = author ? `${title} ${author}` : title;

  const gRes = await axios.get("https://www.googleapis.com/books/v1/volumes", {
    params: {
      q: searchQuery,
      key: process.env.GOOGLE_BOOKS_API_KEY,
    },
  });

  const item = gRes.data.items?.[0];

  if (!item) throw new Error("도서를 찾을 수 없습니다.");

  const info = item.volumeInfo;

  const links = info.imageLinks || {};

  const originalImageUrl =
    links.extraLarge ||
    links.large ||
    links.medium ||
    links.thumbnail ||
    links.smallThumbnail ||
    null;

  const totalPages = info.pageCount;

  let cloudImageUrl: string | null = null;
  if (originalImageUrl) {
    try {
      cloudImageUrl = await uploadImageUrlToCloudinary(originalImageUrl);
    } catch (err) {
      console.error("❌ Cloudinary 업로드 실패, 원본 URL 사용:", err);
      cloudImageUrl = originalImageUrl;
    }
  }

  return {
    이름: info.title || "제목 없음",
    저자: (info.authors || []).join(", "),
    책표지: cloudImageUrl,
    출판사: info.publisher || undefined,
    장르: info.categories?.[0] || undefined,
    isbn: (info.industryIdentifiers?.find((id) => id.type.includes("ISBN"))?.identifier) || undefined,
    출판일: info.publishedDate || undefined,
    줄거리: info.description || undefined,
    "총 페이지": totalPages,
    "처음 읽은 날": getTodayISODate(),
  };
};

// oracle참조하여 Notion에 도서 정보 저장
export const saveBookToNotion = async (bookId: string) => {

  if (!bookId) throw new Error("bookId가 비어있습니다.");

  let conn;

  try {
    conn = await getConnection();

    const selectSql = `
      SELECT title, author, genre, created_at, cover_url, total_pages
      FROM BOOK_INFO
      WHERE book_id = :book_id
    `;

    const rs = await conn.execute(selectSql, { book_id: bookId });

    const row = rs.rows?.[0];

    if (!row) throw new Error(`Oracle에서 book_id=${bookId} 책을 찾을 수 없음`);

    const [title, author, genre, created_at, cover_url, total_pages] = row;

    const properties: Record<string, any> = {
      이름: { title: [{ text: { content: String(title) } }] },
      저자: { rich_text: [{ text: { content: String(author ?? "") } }] },
      상태: { select: { name: "예정" } }, 
      "책 표지":
        typeof cover_url === "string" && cover_url.length
          ? {
              files: [
                {
                  name: "cover.jpg",
                  type: "external",
                  external: { url: String(cover_url) },
                },
              ],
            }
          : { files: [] },
    };

    if (genre) {
      properties["장르"] = { rich_text: [{ text: { content: String(genre) } }] };
    }
    if (total_pages != null) {
      properties["총 페이지"] = { number: Number(total_pages) };
    }
    if (created_at) {
      const d = new Date(created_at);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      properties["처음 읽은 날"] = { date: { start: `${yyyy}-${mm}-${dd}` } };
    }

    const finalCover =
      typeof cover_url === "string" && cover_url.startsWith("http")
        ? String(cover_url)
        : "https://via.placeholder.com/240x340?text=No+Cover";
      const BOOK_DB_ID = process.env.NOTION_DATABASE_ID!;
      const pageParams: any = {
      parent: { database_id: BOOK_DB_ID },
      properties,
      cover: { external: { url: finalCover } },
    };

    const notionRes = await notion.pages.create(pageParams);

    return notionRes;
    
  } catch (err) {
    console.error("❌ saveBookToNotion 오류:", err);
    throw err;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error("⚠️ DB 연결 종료 실패:", e);
      }
    }
  }
};
