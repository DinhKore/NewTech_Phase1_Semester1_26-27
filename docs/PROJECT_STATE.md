# THEO DÕI TIẾN ĐỘ DỰ ÁN (PROJECT STATE)
*Cập nhật lần cuối: Hoàn thiện SQLite Persistent Data & Bộ 20 Evaluation Cases*

## 1. Kịch bản & Kiến trúc (Architecture & Plan) - [TIẾN ĐỘ: 100% M1]
- [x] Xác định 1 kịch bản người dùng (vertical-slice) duy nhất (Chốt: Course Assistant - Trợ lý học tập).
- [x] Viết danh sách 8-15 User Stories chuẩn Milestone 1 (Đã hoàn thành 15 US có Acceptance Criteria).
- [x] Vẽ sơ đồ kiến trúc ứng dụng tổng quan (docs/architecture.md).
- [x] Chốt danh sách API (API Contract) giữa Frontend và Backend (/api/upload, /api/chat, /api/quiz, /api/history).

## 2. Front-end (Giao diện & Trải nghiệm) - [TIẾN ĐỘ: Đã xong phần lõi tương tác]
- [x] Khởi tạo React/Vite và làm sạch dự án.
- [x] Thiết lập Layout chính với Sidebar, Header và Main Content.
- [x] Tách Component và Cài đặt Điều hướng (React Router: Home, Chat, Quiz, 404).
- [x] Xây dựng Form nhập liệu có xác thực (Validation chặn file > 5MB, kiểm tra input rỗng).
- [x] Tích hợp dữ liệu và kết nối API thực tế cho Upload, Chat và Quiz.
- [x] Code các trạng thái giao diện: Đang tải (Loading), Lỗi (Error), Trống (Empty), Thành công (Success).

## 3. Back-end & Lưu trữ (Logic & Dữ liệu)
- [x] Thiết lập thư mục Backend, cài đặt Express và cấu hình file `.env` (Đã chặn git).
- [x] Khởi tạo API Endpoint tiếp nhận yêu cầu từ Front-end (/api/upload, /api/chat, /api/quiz, /api/history).
- [x] Viết hàm kiểm tra tính hợp lệ của dữ liệu đầu vào (Input validation bằng Multer và check body).
- [x] Kết nối Cơ sở dữ liệu (SQLite `node:sqlite`) và viết hàm Lưu/Đọc dữ liệu vĩnh viễn (documents, chat_history, quiz_history).
- [x] Viết API test cơ bản cho một luồng hợp lệ và một luồng không hợp lệ bằng test script/automated tests.

## 4. Tích hợp AI (AI Core Feature)
- [x] Viết Service gọi API mô hình LLM từ bên trong Back-end (Google Gemini qua Backend an toàn).
- [x] Xử lý định dạng dữ liệu AI trả về (Đầu ra có cấu trúc - JSON Structured Output cho Quiz).
- [x] Cài đặt cơ chế phòng vệ (Safe fallback) khi model sập hoặc quá hạn thời gian (try/catch trả status 500 kèm thông báo lịch sự).
- [x] Tạo file đánh giá (20 test cases) để đo lường độ chính xác và Guardrails (docs/EVALUATION_CASES.md).
- [x] Cập nhật file `docs/ai-usage-log.md` ghi nhận sự trợ giúp của AI.

## 5. Lịch sử công việc (Changelog gần nhất)
- Đã kết nối cơ sở dữ liệu SQLite (`course_assistant.db`) bằng module native `node:sqlite`, lưu trữ vĩnh viễn lịch sử chat, bài quiz và tài liệu.
- Đã bổ sung 20 Test Cases đánh giá AI đạt chuẩn Section 4.2 vào `docs/EVALUATION_CASES.md`.
- Đã tạo script kiểm thử tự động `backend/evaluate.ts` đo lường tỷ lệ vượt qua (Pass Rate) của Guardrails.