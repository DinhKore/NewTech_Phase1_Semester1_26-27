# TRỢ LÝ HỌC TẬP THÔNG MINH AI (COURSE ASSISTANT)

> **Đồ án môn học:** new technologies in software engineering 
> **Học kỳ:** 1 — Năm học 2026 - 2027  
> **Sinh viên thực hiện: Hàn Minh Đính 

---

## 📖 1. Giới Thiệu Dự Án

**Course Assistant** là hệ thống trợ lý học tập thông minh ứng dụng công nghệ **Retrieval-Augmented Generation (RAG)** và mô hình ngôn ngữ lớn tiên tiến nhất (**Google Gemini 2.5 Flash** cùng **text-embedding-004**). Hệ thống giúp sinh viên:
- **Tải lên tài liệu học tập (PDF):** Tự động bóc tách nội dung, chia nhỏ thành các đoạn ngữ cảnh (chunks) và tính toán vector embeddings 768 chiều.
- **Hỏi đáp thông minh thời gian thực (RAG Streaming Chat):** Phản hồi chính xác dựa trên tài liệu đã học kèm trích dẫn nguồn cụ thể (tên file, số trang, điểm tương đồng cosine).
- **Tự động tạo đề trắc nghiệm (Structured Output Quiz):** Sinh các câu hỏi trắc nghiệm khách quan 4 lựa chọn (A, B, C, D) kèm giải thích chi tiết, chấm điểm tự động.
- **Bảo vệ an toàn & Chống ảo giác (Guardrails & Anti-Hallucination):** Từ chối các câu hỏi độc hại hoặc ngoài phạm vi, trung thực thừa nhận khi tài liệu không có thông tin.
- **Giám sát quản trị hệ thống (Admin Dashboard):** Theo dõi số lượng request, thời gian phản hồi (latency), số lượng tokens tiêu thụ và chi phí ước tính theo thời gian thực.
- **Cô lập dữ liệu tuyệt đối (Multi-Tenancy):** Mỗi người dùng chỉ truy cập và tìm kiếm được tài liệu thuộc sở hữu của chính mình.

---

## 🛠️ 2. Công Nghệ Cốt Lõi (Tech Stack)

### Backend:
- **Ngôn ngữ & Runtime:** Node.js v22+ / v24, TypeScript (strict mode, NodeNext module resolution).
- **Web Framework:** Express.js 4 với kiến trúc Clean Architecture / Ports-and-Adapters.
- **Cơ sở dữ liệu:** SQLite (`node:sqlite`) với Write-Ahead Logging (`WAL`), thực thi ràng buộc khóa ngoại và cascade deletion.
- **Vector Search:** `InMemoryVectorIndex` phân vùng chặt chẽ theo `userId`, tính toán Cosine Similarity trực tiếp trên `Float32Array`.
- **AI & LLM Provider:** Google Gen AI SDK (`@google/genai`), mô hình `gemini-2.5-flash` và `text-embedding-004`, tích hợp Exponential Backoff Retry.
- **Xác thực & Bảo mật:** Google Identity Services (`google-auth-library`), Stateless JWT (`jsonwebtoken`), Helmet, Rate Limiter.
- **Kiểm định dữ liệu:** `Zod` schemas thẩm định dữ liệu đầu vào và đầu ra có cấu trúc.

### Frontend:
- **Framework & Build tool:** React 19, Vite, TypeScript.
- **Định tuyến & Trạng thái:** React Router v7, Context API (`AuthProvider`).
- **Giao diện & Trải nghiệm:** Vanilla Modern CSS Tokens (không dùng Tailwind phình to), Responsive Hamburger Drawer trên mobile (US13).
- **Hiển thị nội dung:** `react-markdown` kết hợp `remark-gfm` render công thức và bảng biểu; Server-Sent Events (SSE) streaming reader.
- **Thông báo & Tương tác:** `react-hot-toast`, `@react-oauth/google`.

---

## 🚀 3. Hướng Dẫn Cài Đặt & Khởi Chạy

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyên dùng)

Chỉ cần cài đặt [Docker Desktop](https://www.docker.com/) và thực hiện:

1. **Tạo file cấu hình môi trường:**
   Tạo file `.env` tại thư mục gốc của dự án hoặc trong `backend/`:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Điền khóa `GEMINI_API_KEY` (lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/)) và `GOOGLE_CLIENT_ID` (lấy tại Google Cloud Console).

2. **Chạy hệ thống:**
   ```bash
   docker compose up --build
   ```
   - **Frontend:** Truy cập tại [http://localhost](http://localhost) (hoặc port 80).
   - **Backend API:** Truy cập tại [http://localhost:5000](http://localhost:5000).

---

### Cách 2: Chạy trực tiếp trên máy cục bộ (Development Mode)

#### Bước 1: Khởi động Backend
```bash
cd backend
npm install
cp .env.example .env
```
Chỉnh sửa file `backend/.env`:
```env
PORT=5000
DATABASE_PATH=./data/app.db
GEMINI_API_KEY=AIzaSy...your-gemini-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
JWT_SECRET=your-secure-random-jwt-secret-min-32-chars
ADMIN_EMAILS=your-email@gmail.com
```

> **Mẹo phát triển khi chưa có Google Client ID:**  
> Đặt `GOOGLE_DISABLE_AUTH=true` trong `backend/.env`. Khi đó backend sẽ tự động kích hoạt Mock Google Verifier và cho phép đăng nhập tức thì cho mục đích test/dev.

Khởi chạy server backend:
```bash
npm run dev
```

#### Bước 2: Khởi động Frontend
Mở một cửa sổ Terminal mới:
```bash
cd frontend
npm install
cp .env.example .env
```
Kiểm tra file `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Khởi chạy web client:
```bash
npm run dev
```
Trình duyệt sẽ tự động mở tại [http://localhost:5173](http://localhost:5173).

---

## 🧪 4. Hướng Dẫn Chạy Kiểm Thử (Automated Tests & Evaluation)

Dự án cung cấp bộ kiểm thử toàn diện từ Unit Test đến Integration Test và kịch bản Đánh giá RAG tự động:

### 1. Chạy Unit & Integration Tests (Backend)
```bash
cd backend
npm test
```
Bộ test bao gồm:
- `tests/vector.test.ts`: Kiểm thử toán học vector (Dot product, Norm, Cosine Similarity, Float32 Byte encoding).
- `tests/vector-index.test.ts`: Kiểm thử phân vùng dữ liệu đa người dùng trên RAM và logic dọn dẹp khi xóa tài liệu.
- `tests/prompt-repository.test.ts`: Kiểm thử đọc và thay thế biến trong prompt file ngoài.
- `tests/quiz-output.test.ts`: Kiểm thử bóc tách JSON, loại bỏ markdown fences và thẩm định Zod schema.
- `tests/evaluation-judge.test.ts`: Kiểm thử bộ chấm điểm tự động (Keyword Judge).
- `tests/api.test.ts`: Kiểm thử tích hợp toàn bộ các endpoint API (Auth, Documents CRUD, Chat SSE, Quiz, Admin RBAC, Data Isolation, Data Persistence).

### 2. Chạy Kịch bản Đánh Giá RAG Tự Động (Evaluation Runner)
```bash
cd backend
npm run evaluate
```
Script sẽ chạy tự động **20 kịch bản test** trong `evaluation/cases.ts` (bao gồm câu hỏi đúng trọng tâm, câu hỏi ngoài lề cần từ chối, câu hỏi bẫy ảo giác) và xuất báo cáo kết quả chi tiết:
- Độ chính xác (Accuracy %)
- Tỷ lệ từ chối hợp lệ (Refusal Rate %)
- Thời gian phản hồi trung bình (Latency ms)

---

## 🎯 5. Hướng Dẫn Thao Tác Trực Tiếp Khi Bảo Vệ Đồ Án (Milestone Defense)

### Yêu cầu: Đổi nội dung Prompt trực tiếp mà không cần sửa code / compile lại
Hệ thống quản lý prompt hoàn toàn độc lập tại thư mục `backend/prompts/`:
1. Mở file [backend/prompts/chat-rag.v1.txt](file:///d:/University/NewTech_Again/NewTech_Phase1_Semester1_26-27/backend/prompts/chat-rag.v1.txt).
2. Thêm một chỉ thị mới, ví dụ:  
   `"Bắt buộc luôn mở đầu câu trả lời bằng lời chào: 'Xin chào bạn sinh viên chăm chỉ!'"`
3. Lưu file.
4. Mở giao diện chat và đặt câu hỏi. Hệ thống sẽ áp dụng ngay lập tức chỉ thị mới mà không cần biên dịch hay can thiệp vào mã nguồn TypeScript!

---

## 📚 6. Tài Liệu Tham Khảo Kỹ Thuật

Tất cả các tài liệu thiết kế và phản tư được lưu trữ đầy đủ trong thư mục `docs/`:
- [Ma Trận Truy Vết 15 User Stories (docs/USER_STORIES.md)](file:///d:/University/NewTech_Again/NewTech_Phase1_Semester1_26-27/docs/USER_STORIES.md)
- [Bản Ghi Quyết Định Kiến Trúc (docs/ADRs.md)](file:///d:/University/NewTech_Again/NewTech_Phase1_Semester1_26-27/docs/ADRs.md)
- [Tài Liệu Kiến Trúc & Biểu Đồ Mermaid (docs/architecture.md)](file:///d:/University/NewTech_Again/NewTech_Phase1_Semester1_26-27/docs/architecture.md)
- [Báo Cáo Phản Tư Sử Dụng AI (AI_USAGE.md)](file:///d:/University/NewTech_Again/NewTech_Phase1_Semester1_26-27/AI_USAGE.md)
- [Danh Sách Kịch Bản Đánh Giá RAG (docs/EVALUATION_CASES.md)](file:///d:/University/NewTech_Again/NewTech_Phase1_Semester1_26-27/docs/EVALUATION_CASES.md)
