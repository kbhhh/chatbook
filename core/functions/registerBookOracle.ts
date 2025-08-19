import { getConnection } from "../../backend/db/oracle.ts";
import { v4 as uuidv4 } from 'uuid';

interface BookInfo {
  title: string;
  author: string;
  publisher?: string;
  genre?: string;
  coverUrl?: string;
  totalPages?: number;
  isbn?: string;
  publishDate?: Date;
  description?: string;
}

// Oracle에 도서 정보를 등록하고 객체 반환
export async function registerBook(book: BookInfo) {

  let connection;

  try {
    connection = await getConnection();

    const bookId = `BOOK_${uuidv4()}`;

    const sql = `
      INSERT INTO BOOK_INFO (
        book_id, title, author, publisher, genre,
        cover_url, total_pages, isbn, publish_date, description
      ) VALUES (
        :book_id, :title, :author, :publisher, :genre,
        :cover_url, :total_pages, :isbn, :publish_date, :description
      )
    `;

    const totalPagesValue = book.totalPages !== undefined && book.totalPages !== null
      ? Number(book.totalPages)
      : null;

    if (totalPagesValue !== null && isNaN(totalPagesValue)) {
      throw new Error(`totalPages 값이 숫자가 아닙니다: ${book.totalPages}`);
    }

    await connection.execute(sql, {
      book_id: bookId,
      title: book.title,
      author: book.author,
      publisher: book.publisher || null,
      genre: book.genre || null,
      cover_url: book.coverUrl || null,
      total_pages: totalPagesValue,
      isbn: book.isbn || null,
      publish_date: book.publishDate || null,
      description: book.description || null,
    }, {
      autoCommit: true,
    });

    return { ...book, bookId };
  } catch (err) {
    console.error('❌ registerBook 오류:', err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('❌ connection close 오류:', err);
      }
    }
  }
}
