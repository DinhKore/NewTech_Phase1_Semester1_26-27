# BẢN GHI QUYẾT ĐỊNH KIẾN TRÚC (ARCHITECTURE DECISION RECORDS - ADRs)

**Dự án:** Trợ lý Học tập AI (Course Assistant)  
**Tác giả:** Đỗ Vũ Gia Định (Nhóm 01 thành viên)  
**Tiêu chuẩn định dạng:** Michael Nygard ADR Template  

---

## Mục Lục
1. [ADR 01: Multi-tenant In-Memory Vector Index kết hợp SQLite Persistence](#adr-01)
2. [ADR 02: Xác thực Google OAuth2 ID Token kết hợp JWT Session](#adr-02)
3. [ADR 03: Sử dụng Server-Sent Events (SSE) cho Real-Time RAG Streaming](#adr-03)
4. [ADR 04: Quản lý Prompt tách rời dạng tệp bên ngoài (External Versioned Prompts)](#adr-04)
5. [ADR 05: Kiểm soát Structured Output qua Zod Schema Validation và Retry](#adr-05)
6. [ADR 06: Kiến trúc Đa tầng theo nguyên lý Ports-and-Adapters và Dependency Injection](#adr-06)

---

<a name="adr-01"></a>
## ADR 01: Multi-tenant In-Memory Vector Index kết hợp SQLite Persistence

### Trạng thái
**Accepted** (Đã áp dụng và kiểm thử toàn diện)

### Bối cảnh & Vấn đề
Hệ thống cần lưu trữ vector embeddings (768 chiều từ `text-embedding-004`) để thực hiện tìm kiếm tương đồng (Cosine Similarity). Tuy nhiên:
- Cài đặt PostgreSQL với extension `pgvector` tạo ra gánh nặng lớn về tài nguyên, cấu hình hạ tầng phức tạp và khó khăn khi đóng gói chấm điểm đồ án cục bộ.
- Các thư viện vector store bên thứ ba (như một số module của Langchain) thường gặp lỗi không tương thích phiên bản binary hoặc Node.js v22/v24.
- **Yêu cầu cốt lõi (US15):** Hệ thống phục vụ nhiều người dùng khác nhau (Multi-tenancy), dữ liệu vector của người dùng A tuyệt đối không được rò rỉ sang người dùng B.

### Các lựa chọn đã xem xét
1. **PostgreSQL + pgvector:** Mạnh mẽ, chuẩn enterprise nhưng yêu cầu cài đặt server database độc lập, cấu hình Docker phức tạp và chiếm nhiều RAM.
2. **ChromaDB / Pinecone / Qdrant:** Phụ thuộc vào dịch vụ cloud bên thứ ba hoặc container riêng, dễ gặp vấn đề về API rate limit hoặc network latency.
3. **SQLite kết hợp In-Memory Partitioned Vector Index (Lựa chọn được chọn):**
   - SQLite (`node:sqlite` hoặc driver nhúng) lưu trữ metadata văn bản, nội dung chunk và vector dưới dạng BLOB (Float32Array byte representation).
   - `InMemoryVectorIndex` trong backend load vector khi khởi động máy chủ và tổ chức thành `Map<number, VectorEntry[]>` theo từng `userId`.

### Quyết định
Chọn **SQLite + In-Memory Partitioned Vector Index**. Toàn bộ tác vụ tính toán vector math (dot product, norm, cosine similarity) được tối ưu bằng typed arrays (`Float32Array`).

### Hệ quả
- **Tích cực:** Tốc độ tìm kiếm tương đồng cực nhanh (chỉ mất ~1-3ms trong RAM), không cần cài đặt database bên ngoài, đảm bảo dữ liệu phục hồi nguyên vẹn khi server khởi động lại (US12), đảm bảo cô lập dữ liệu người dùng 100% theo `userId` (US15).
- **Hạn chế:** Khi số lượng chunk lên tới hàng triệu bản ghi, RAM sẽ tăng tuyến tính. Tuy nhiên với phạm vi môn học và tài liệu giáo trình cá nhân (< 50,000 chunks), dung lượng RAM tiêu thụ chỉ dưới 150MB.

---

<a name="adr-02"></a>
## ADR 02: Xác thực Google OAuth2 ID Token kết hợp JWT Session

### Trạng thái
**Accepted**

### Bối cảnh & Vấn đề
Mã nguồn ban đầu dùng cơ chế "giả lập đăng nhập" (Fake Auth) bằng cách chỉ kiểm tra email hoặc gán cứng user, không an toàn và vi phạm tiêu chí chấm điểm US01. Hệ thống cần giải pháp xác thực Google OAuth2 thực thụ, an toàn và dễ tích hợp cho Single Page Application (SPA).

### Các lựa chọn đã xem xét
1. **OAuth2 Authorization Code Grant truyền thống với redirect URI:** Đòi hỏi frontend redirect toàn trang sang Google, backend tiếp nhận code, exchange token và redirect ngược lại. Luồng hoạt động phức tạp và dễ gặp lỗi CORS / Cookie samesite trên môi trường dev.
2. **Google Identity Services (GIS) Sign-In With Google Button + JWT Session (Lựa chọn được chọn):**
   - Frontend sử dụng `@react-oauth/google` để hiển thị nút đăng nhập One Tap / Popup của Google.
   - Google cấp ID Token (`credential`) trực tiếp cho client.
   - Client gửi credential lên endpoint `POST /api/auth/google`.
   - Backend sử dụng thư viện chính thức `google-auth-library` (`OAuth2Client.verifyIdToken`) để verify chữ ký số của Google.
   - Sau khi xác thực, backend tạo/cập nhật user trong DB và cấp JWT Access Token thời hạn 7 ngày.

### Quyết định
Áp dụng **Google Identity Services ID Token Verification + Stateless JWT Session**. Đồng thời hỗ trợ `GOOGLE_DISABLE_AUTH=true` với Mock Google Verifier dành riêng cho môi trường CI/CD và automated tests.

### Hệ quả
- **Tích cực:** Trải nghiệm người dùng mượt mà (popup không reload trang), bảo mật cao chuẩn cryptographic verification, stateless JWT giúp backend dễ dàng scale và phân quyền RBAC (`user`, `admin`).
- **Hạn chế:** Client phụ thuộc vào script Google SDK tải từ CDN của Google.

---

<a name="adr-03"></a>
## ADR 03: Sử dụng Server-Sent Events (SSE) cho Real-Time RAG Streaming

### Trạng thái
**Accepted**

### Bối cảnh & Vấn đề
Khi người dùng đặt câu hỏi, mô hình LLM (Gemini) mất từ 3 đến 10 giây để hoàn thành toàn bộ câu trả lời. Nếu gửi câu trả lời bằng một HTTP request truyền thống dạng blocking, người dùng sẽ phải chờ đợi lâu (bad UX). Hệ thống cần streaming phản hồi theo thời gian thực (US06).

### Các lựa chọn đã xem xét
1. **WebSockets:** Hỗ trợ giao tiếp 2 chiều toàn phần (Full-duplex). Tuy nhiên, luồng trò chuyện hỏi đáp chỉ cần 1 chiều từ Server về Client (Server push stream). WebSockets đòi hỏi quản lý connection state, heartbeat và khó đi qua một số proxy/firewall.
2. **HTTP Polling / Long Polling:** Gây lãng phí tài nguyên và độ trễ cao.
3. **Server-Sent Events (SSE) trên nền HTTP (Lựa chọn được chọn):** Sử dụng chuẩn `text/event-stream`. Client gửi câu hỏi bằng HTTP POST, server mở SSE stream và liên tục đẩy các JSON frame (`sources`, `chunk`, `done`, `error`).

### Quyết định
Sử dụng **Server-Sent Events (SSE)** thông qua lớp `SseWriter` ở backend và `readSseEvents` ở frontend.

### Hệ quả
- **Tích cực:** Tương thích hoàn toàn với hạ tầng HTTP chuẩn, tự động hỗ trợ resume, dễ dàng debug qua Network tab, hỗ trợ push cả metadata trích dẫn (`sources`) trước khi streaming text chunk đầu tiên.
- **Hạn chế:** Cần cấu hình reverse proxy (Nginx) tắt buffer (`proxy_buffering off;`) để dữ liệu được truyền thẳng tới trình duyệt.

---

<a name="adr-04"></a>
## ADR 04: Quản lý Prompt tách rời dạng tệp bên ngoài (External Versioned Prompts)

### Trạng thái
**Accepted**

### Bối cảnh & Vấn đề
Mã nguồn trước đây nhúng cứng các chuỗi prompt dài hàng chục dòng vào sâu bên trong code TypeScript (`services/chat.ts`). Điều này gây ra:
- Khó bảo trì, sửa lỗi prompt phải build lại toàn bộ ứng dụng.
- Không thể đáp ứng yêu cầu chấm thi của Giảng viên: "Đổi prompt trực tiếp trong buổi bảo vệ mà không cần sửa code / compile lại".
- Không có quản lý phiên bản (Prompt Versioning).

### Các lựa chọn đã xem xét
1. **Hardcoded String trong TypeScript:** Nhanh lúc đầu nhưng bất khả thi khi tinh chỉnh guardrails và vi phạm nguyên lý phân tách trách nhiệm.
2. **Lưu Prompt trong cơ sở dữ liệu:** Linh hoạt nhưng khó theo dõi lịch sử thay đổi qua Git commits.
3. **External Versioned Prompt Files (`prompts/*.v1.txt`) (Lựa chọn được chọn):**
   - Đặt các file prompt độc lập trong thư mục `backend/prompts/` (ví dụ `chat-rag.v1.txt`, `quiz-generator.v1.txt`).
   - Sử dụng cú pháp biến tiêu chuẩn `{{documents_context}}`, `{{question}}`, `{{question_count}}`.
   - `PromptRepository` nạp và cache nội dung file, hỗ trợ reload tức thì mà không cần can thiệp logic code.

### Quyết định
Áp dụng **External Versioned Prompts** với `PromptRepository`.

### Hệ quả
- **Tích cực:** Dễ dàng thay đổi prompt ngay trong lúc demo/bảo vệ đồ án, lưu vết lịch sử prompt qua Git, code sạch và tập trung vào business logic.

---

<a name="adr-05"></a>
## ADR 05: Kiểm soát Structured Output qua Zod Schema Validation và Retry

### Trạng thái
**Accepted**

### Bối cảnh & Vấn đề
Tính năng tạo câu hỏi trắc nghiệm (US10) đòi hỏi AI sinh ra danh sách câu hỏi dạng JSON chuẩn: 4 phương án A/B/C/D, đáp án đúng và lời giải thích. Tuy nhiên, LLM thường có thể sinh kèm Markdown code fences (```json), trả về sai tên trường hoặc thiếu thuộc tính, dẫn đến sập giao diện frontend nếu parse thô.

### Các lựa chọn đã xem xét
1. **JSON.parse thô:** Dễ crash ứng dụng khi LLM sinh sai format hoặc thừa ký tự.
2. **Gemini SDK responseSchema:** Hỗ trợ ép kiểu JSON Schema ở tầng API của Gemini. Tuy nhiên một số model fallback hoặc cấu hình SDK cũ có thể không tương thích hoặc trả về format biến thể.
3. **Phối hợp Two-Stage: Prompt chỉ thị + Zod Schema Validator + Retry Loop (Lựa chọn được chọn):**
   - Prompt quy định rõ cấu trúc JSON mong đợi.
   - Tầng ứng dụng dùng hàm `stripCodeFences` dọn dẹp markdown block.
   - Thư viện `Zod` thẩm định chặt chẽ kiểu dữ liệu của từng trường (`question.min(5)`, `options.length(4)`, `answer.enum(['A','B','C','D'])`).
   - Nếu parse thất bại, cơ chế retry tự động gửi lại yêu cầu kèm thông báo lỗi cụ thể để AI sửa chữa.

### Quyết định
Áp dụng **Zod Schema Validation kết hợp Automatic Retry** trong `QuizService` và `parseQuizOutput`.

### Hệ quả
- **Tích cực:** Đảm bảo 100% dữ liệu gửi về frontend luôn toàn vẹn cấu trúc, không bao giờ gây lỗi giao diện, có unit test độc lập kiểm thử khả năng bóc tách JSON (`quiz-output.test.ts`).

---

<a name="adr-06"></a>
## ADR 06: Kiến trúc Đa tầng theo nguyên lý Ports-and-Adapters và Dependency Injection

### Trạng thái
**Accepted**

### Bối cảnh & Vấn đề
Mã nguồn ban đầu dính chặt vào các đối tượng cụ thể (tight coupling), ví dụ trực tiếp gọi `new GoogleGenAI()` trong file route, không có lớp trừu tượng (abstraction), không thể viết unit test nếu không có API key thật và mạng internet.

### Các lựa chọn đã xem xét
1. **Kiến trúc kịch bản (Script-based / Monolithic Express):** Viết logic xử lý trực tiếp trong route handlers. Nhanh nhưng không thể test, khó mở rộng và vi phạm SOLID.
2. **Clean / Hexagonal Architecture với Dependency Injection Container (Lựa chọn được chọn):**
   - **Domain / Ports:** Định nghĩa interfaces cho các dịch vụ bên ngoài (`LlmClient`, `EmbeddingClient`, `PromptRepositoryPort`).
   - **Infrastructure / Adapters:** Triển khai cụ thể (`GeminiChatClient`, `GeminiEmbeddingClient`, `SqliteDatabase`).
   - **Modules:** Chia theo tính năng (`auth`, `documents`, `chat`, `quiz`, `admin`, `ai-usage`). Mỗi module gồm Controller, Service, Repository, DTO/Schemas.
   - **Composition Root (`container.ts`):** Khởi tạo và liên kết (wire) các dependency duy nhất tại một điểm khởi đầu.

### Quyết định
Áp dụng **Hexagonal / Clean Architecture kết hợp DI Container**.

### Hệ quả
- **Tích cực:** Mã nguồn tuân thủ triệt để nguyên lý SOLID (đặc biệt là Dependency Inversion và Single Responsibility). Dễ dàng thay thế Gemini bằng OpenAI/Claude chỉ bằng cách viết thêm một Adapter mới. Cho phép viết trọn bộ Test Suite chạy siêu tốc với Fake Adapters (`fakes.ts`) mà không phụ thuộc hạ tầng ngoài.
