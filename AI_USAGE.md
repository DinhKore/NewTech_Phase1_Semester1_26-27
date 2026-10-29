# BÁO CÁO PHẢN TƯ SỬ DỤNG AI TRONG DỰ ÁN (AI-ASSISTED DEVELOPMENT REFLECTION)

**Dự án:** Trợ lý Học tập AI (Course Assistant)  
**Sinh viên thực hiện:** Đỗ Vũ Gia Định (Nhóm 01 thành viên - Solo)  
**Môn học:** Công nghệ Mới trong Phát triển Phần mềm  
**Học kỳ / Niên khóa:** HK1 (2026 - 2027)  

---

## 1. Danh Sách Công Cụ AI Đã Sử Dụng

1. **Google Antigravity (Claude 3.7 Sonnet / Gemini 2.5 Pro):** Công cụ hỗ trợ phân tích mã nguồn toàn diện, rà soát kiến trúc (Architecture Review), tái cấu trúc (Refactoring) và xây dựng bộ kiểm thử tự động.
2. **GitHub Copilot / Cursor:** Hỗ trợ sinh mã nguồn nhanh (code completion) cho các hàm utility, typed interfaces và HTML/CSS boilerplate.
3. **ChatGPT (GPT-4o):** Tham vấn các phương án kiến trúc RAG, giải pháp kiểm soát ảo giác (Hallucination Control) và thiết kế hệ thống đánh giá tự động (LLM Evaluation Judge).

---

## 2. Bảng Tổng Hợp Các Tác Vụ Phát Triển Với AI

| STT | Phân hệ / Tác vụ | Prompt chính đã sử dụng | Code AI sinh ra ban đầu | Phần mã nguồn đã can thiệp / Viết lại | Lý do can thiệp & Tối ưu hóa |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Xác thực người dùng (Auth) | *"Viết module login Google OAuth2 cho Express và React"* | Sử dụng form đăng nhập giả lập (Fake Auth) chỉ nhận email rồi cấp token bất kỳ; không verify với Google. | Viết lại hoàn toàn với `google-auth-library` phía backend để verify cryptographic signature của ID Token từ Google. Tích hợp `@react-oauth/google` phía frontend. | Code ban đầu không an toàn, vi phạm nghiêm trọng tiêu chuẩn bảo mật và tiêu chí nghiệm thu của US01. |
| **2** | Quản lý Vector & RAG | *"Viết in-memory vector search cho các chunk tài liệu"* | Tạo một mảng toàn cục `const vectors = []` dùng chung cho toàn bộ server. | Thiết kế lại lớp `InMemoryVectorIndex` phân vùng chặt chẽ theo `Map<number, VectorEntry[]>` dựa trên `userId`. Thêm phương thức `removeByDocument` dọn dẹp khi xóa file. | Nếu dùng mảng chung, người dùng A có thể xem trộm hoặc truy vấn RAG ra tài liệu học tập bí mật của người dùng B (vi phạm US15). |
| **3** | Prompt Management | *"Tích hợp prompt RAG và sinh câu hỏi trắc nghiệm"* | Chuỗi Template String viết cứng (hardcoded string) trực tiếp trong file `chat.service.ts`. | Tách toàn bộ prompt ra các tệp văn bản độc lập trong `backend/prompts/*.v1.txt`, quản lý qua `PromptRepository` với biến thay thế `{{var}}`. | Đáp ứng tiêu chí bắt buộc của giảng viên: Có thể thay đổi nội dung prompt ngay trong buổi bảo vệ mà không cần sửa code hay biên dịch lại. |
| **4** | Đánh giá RAG (Evaluation) | *"Chạy đánh giá 20 câu hỏi test case trên endpoint SSE"* | Dùng `fetch('/api/chat/stream')` rồi gọi `await res.json()` để lấy câu trả lời. | Viết lại `backend/evaluation/run.ts` gọi trực tiếp `chatService.ask` và thiết kế bộ chấm từ khóa tự động (Keyword Judge) tính Accuracy, Relevancy, Refusal rate. | Endpoint SSE trả về stream chunk `text/event-stream`, gọi `res.json()` sẽ văng exception cú pháp `Unexpected token d in JSON at position 0`. |
| **5** | Trắc nghiệm có cấu trúc (Quiz) | *"Yêu cầu LLM sinh câu hỏi trắc nghiệm JSON"* | Gọi LLM và trực tiếp `JSON.parse(res.text)` không qua thẩm định. | Xây dựng pipeline kiểm định Two-stage: Dọn markdown code fences -> Thẩm định schema qua thư viện `Zod` (`LlmQuizSchema`) -> Tự động retry nếu không hợp lệ. | LLM thường trả về kèm ```json hoặc sai tên trường, nếu không thẩm định bằng Zod sẽ gây sập ứng dụng (Crash UI). |
| **6** | Kiến trúc mã nguồn | *"Tổ chức thư mục backend và frontend"* | Đặt toàn bộ routes, services, helpers lẫn lộn trong thư mục gốc `backend/`. | Tái cấu trúc theo Clean Architecture: Tách thành Domain Ports, Infrastructure Adapters, Feature Modules, Dependency Injection Container (`container.ts`). | Tách biệt trách nhiệm (SoC), tuân thủ nguyên lý SOLID, cho phép viết test độc lập không phụ thuộc mạng hay API thật. |
| **7** | Tối ưu Vector Embedding | *"Tạo embedding cho các chunks từ file PDF"* | Gọi hàm `embedContent` tuần tự từng chunk một bằng vòng lặp `for`. | Chuyển sang kỹ thuật **Batch Embedding** (`batchEmbedContents`) với kích thước lô 50 chunks/lần. | Một file PDF có 76 chunks nếu gọi tuần tự sẽ bắn 76 requests liên tục, gây tràn hạn ngạch 100 RPM của Gemini (lỗi 429 Rate Limit). Chuyển sang batch chỉ mất 2 requests (giảm 97.4% tải). |
| **8** | Trải nghiệm cuộn trang Chat | *"Xây dựng giao diện tin nhắn cuộn mượt mà"* | Dùng `scrollIntoView()` kích hoạt trên mỗi lần cập nhật `messages`. | Thay bằng `scrollTo()` nội bộ container, phát hiện vị trí cuộn của người dùng; nếu người dùng đang đọc tin nhắn cũ phía trên thì không cưỡng chế cuộn xuống đáy. | Khi streaming với tốc độ 20 chunks/giây, hàm cũ liên tục giật màn hình xuống đáy, khiến người dùng không thể lướt chuột lên xem lại các câu hỏi cũ phía trên. |

---

## 3. Phân Tích Chi Tiết Các Trường Hợp Cụ Thể (Case Studies)

### Trường Hợp 1: AI Đề Xuất Code Bị Lỗ Hổng Bảo Mật & Bug Thực Thi

#### 1. Ngữ cảnh & Phát hiện
Trong giai đoạn đầu phát triển tính năng RAG Chat và Quản lý tài liệu:
- Khi yêu cầu AI sinh mã nguồn cho module lưu trữ Vector, AI đã đề xuất sử dụng một singleton instance của vector store trong RAM lưu chung tất cả chunks vào một mảng duy nhất.
- Khi kiểm tra tính năng bảo mật đa người dùng (Multi-tenancy - US15), chúng tôi tạo 2 tài khoản: Sinh viên A (tải lên tài liệu "Mạng máy tính") và Sinh viên B (tải lên tài liệu "Giải tích"). Khi Sinh viên B hỏi về "Subnetting", hệ thống lại trích xuất chunk từ tài liệu của Sinh viên A và trả lời bình thường!
- Ngoài ra, ở file `backend/evaluate.ts`, AI đã viết code gửi request đến endpoint `/api/chat/stream` nhưng lại parse kết quả bằng `await res.json()`, khiến runner bị crash ngay lập tức vì endpoint này trả về Server-Sent Events (`data: {...}\n\n`).

#### 2. Biện pháp Khắc phục & Điều chỉnh
- **Khắc phục lỗi Multi-tenancy (US15):**
  Chúng tôi đã tái cấu trúc lớp `InMemoryVectorIndex`:
  ```typescript
  export class InMemoryVectorIndex {
    // Phân vùng độc lập theo userId
    private readonly byUser = new Map<number, VectorEntry[]>();

    search(userId: number, queryVector: Float32Array, topK: number, minScore: number): VectorSearchResult[] {
      const userEntries = this.byUser.get(userId) ?? [];
      // Chỉ tính Cosine Similarity trên các chunks thuộc quyền sở hữu của userId này
      ...
    }
  }
  ```
  Đồng thời thêm ràng buộc `user_id` và khóa ngoại `ON DELETE CASCADE` trên bảng `documents` và `document_chunks` trong SQLite. Viết bổ sung bộ kiểm thử tự động `tests/api.test.ts` xác thực triệt để việc cô lập dữ liệu.

- **Khắc phục lỗi SSE Runner:**
  Chúng tôi đã phân tách rõ ràng:
  - Tầng HTTP Adapter xử lý SSE qua `SseWriter`.
  - Tầng Domain Service cung cấp phương thức `ask(user, question)` trả về kết quả resolved object, cho phép script đánh giá `backend/evaluation/run.ts` chạy trực tiếp mà không bị phụ thuộc vào tầng transport mạng.

---

### Trường Hợp 2: AI Đề Xuất Giải Pháp Kiến Trúc Chưa Tối Ưu (Tight Coupling)

#### 1. Ngữ cảnh & Tranh luận
Khi triển khai tích hợp AI Gemini:
- AI ban đầu đề xuất khởi tạo trực tiếp instance SDK `new GoogleGenAI(process.env.GEMINI_API_KEY)` ngay bên trong hàm xử lý route của Express (`routes/chat.ts`).
- Nội dung Prompt RAG dài 40 dòng cũng được nhúng cứng (hardcoded string) dưới dạng template string JavaScript bên trong cùng file này.

**Nhận diện các nhược điểm nghiêm trọng của thiết kế này:**
1. **Vi phạm nguyên lý Dependency Inversion (Chữ D trong SOLID):** Tầng điều khiển HTTP bị dính chặt vào implementation cụ thể của thư viện Google SDK. Không thể chạy automated tests mà không có API Key thật hoặc khi offline.
2. **Không có khả năng chịu lỗi (Resilience):** Khi API Gemini gặp tình trạng quá tải (HTTP 429) hoặc mạng chập chờn, ứng dụng văng lỗi trực tiếp về client.
3. **Bất khả thi khi bảo vệ đồ án:** Giảng viên yêu cầu thay đổi thử một câu lệnh trong system prompt để quan sát hành vi của AI. Nếu prompt bị nhúng trong mã nguồn, người bảo vệ phải sửa file code, build lại dự án và khởi động lại server.

#### 2. Giải pháp Kiến trúc Cải tiến (Clean Architecture & External Prompts)
Chúng tôi đã quyết định tái cấu trúc lại toàn bộ hệ sinh thái AI theo kiến trúc Hexagonal:
1. **Trừu tượng hóa qua Ports:**
   Định nghĩa interface chuẩn `LlmClient` và `EmbeddingClient` trong `src/infrastructure/ai/ports.ts`.
2. **Triển khai Adapters với Resilience:**
   Viết `GeminiChatClient` triển khai `LlmClient`, tích hợp thuật toán Exponential Backoff Retry (`withRetry`) và cơ chế fallback sang mô hình dự phòng nếu mô hình chính không phản hồi.
3. **Quản lý Prompt bên ngoài:**
   Tạo thư mục `backend/prompts/` chứa các tệp `.txt` độc lập. Lớp `PromptRepository` chịu trách nhiệm đọc và render nội dung. Khi cần đổi prompt, chỉ cần chỉnh sửa file text mà không chạm vào một dòng mã nguồn nào.
4. **Dependency Injection:**
   Toàn bộ hệ thống được khởi tạo tại `container.ts` (Composition Root), cho phép thay thế dễ dàng các fake implementations trong bộ test tự động.

---

### Trường Hợp 3: AI Đề Xuất Cơ Chế Embedding Tuần Tự Gây Lỗi Quá Tải Hạn Ngạch (Rate Limit 429)

#### 1. Ngữ cảnh & Phát hiện
Khi người dùng tải lên một file giáo trình PDF dài (chẳng hạn 3 trang băm ra thành 76 chunks):
- Mã nguồn ban đầu do AI sinh ra đã duyệt qua từng chunk bằng vòng lặp `for` và gọi `client.getGenerativeModel().embedContent(chunk.content)` tuần tự.
- Hệ quả: Chỉ với 1 file PDF, hệ thống đã bắn liên tiếp 76 HTTP requests đến máy chủ Google trong vòng vài giây. Hạn ngạch miễn phí (Free Tier) của Google Gemini là 100 requests/phút (RPM). Khi người dùng tải lên 2 file liên tiếp, hệ thống ngay lập tức nhận mã lỗi **HTTP 429 Too Many Requests: Resource has been exhausted**, làm gián đoạn toàn bộ quá trình nạp dữ liệu.

#### 2. Biện pháp Khắc phục & Điều chỉnh
- Chúng tôi đã nghiên cứu tài liệu chính thức của Google Gemini API và phát hiện endpoint chuyên dụng: `batchEmbedContents`.
- Tái cấu trúc lớp `GeminiEmbeddingClient` trong backend:
  ```typescript
  // Gom các chunk thành các mảng batch tối đa 50 phần tử
  const batchSize = 50;
  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize);
    const res = await model.batchEmbedContents({
      requests: slice.map((text) => ({
        content: { role: 'user', parts: [{ text }] },
      })),
    });
    ...
  }
  ```
- Kết quả: File 76 chunks chỉ còn tốn đúng **2 requests** (giảm 97.4% lượng network calls), tốc độ nạp tài liệu tăng gấp 6 lần và loại bỏ hoàn toàn nguy cơ bị chặn rate limit.

---

## 4. Bài Học Kinh Nghiệm & Kết Luận

1. **AI là trợ thủ, không phải kiến trúc sư:** AI rất giỏi trong việc hoàn thiện các đoạn code nhỏ và tạo boilerplate, nhưng thiếu tầm nhìn tổng thể về kiến trúc hệ thống, ranh giới dữ liệu và tính an toàn đa người dùng (multi-tenancy).
2. **Kiểm thử tự động (Automated Testing) là chốt chặn quan trọng nhất:** Không bao giờ đưa code AI sinh ra vào sản phẩm mà không có unit test và integration test đi kèm để kiểm chứng các trường hợp biên (edge cases).
3. **Tuân thủ Clean Code & SOLID:** Việc giữ vững tính độc lập giữa các tầng giúp dự án dễ bảo trì, dễ mở rộng và đạt điểm số tối đa trong các đợt đánh giá đồ án.
