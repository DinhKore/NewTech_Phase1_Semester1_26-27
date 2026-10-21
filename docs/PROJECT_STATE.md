# THEO DÕI TIẾN ĐỘ DỰ ÁN (PROJECT STATE)
*Cập nhật lần cuối: Hoàn thiện M1 User Stories & Frontend Skeleton*

## 1. Kịch bản & Kiến trúc (Architecture & Plan) - [TIẾN ĐỘ: 90% M1]
- [x] Xác định 1 kịch bản người dùng (vertical-slice) duy nhất (Chốt: Course Assistant - Trợ lý học tập).
- [x] Viết danh sách 8-15 User Stories chuẩn Milestone 1 (Đã hoàn thành 15 US có Acceptance Criteria).
- [x] Vẽ sơ đồ kiến trúc ứng dụng tổng quan (docs/architecture.md).
- [ ] Chốt danh sách API (API Contract) giữa Frontend và Backend.

## 2. Front-end (Giao diện & Trải nghiệm) - [TIẾN ĐỘ: Đang làm Tuần 3]
- [x] Khởi tạo React/Vite và làm sạch dự án.
- [x] Thiết lập Layout chính với Sidebar, Header và Main Content.
- [x] Tách Component và Cài đặt Điều hướng (React Router: Home, Chat, 404).
- [ ] Xây dựng Form nhập liệu có xác thực (Validation).
- [ ] Tích hợp dữ liệu giả (Mock data) để hiển thị danh sách/kết quả.
- [ ] Code các trạng thái giao diện: Đang tải (Loading), Lỗi (Error), Trống (Empty).

## 3. Back-end & Lưu trữ (Logic & Dữ liệu)
- [x] Thiết lập thư mục Backend, cài đặt Express và cấu hình file `.env` (Đã chặn git).
- [ ] Khởi tạo API Endpoint tiếp nhận yêu cầu từ Front-end.
- [ ] Viết hàm kiểm tra tính hợp lệ của dữ liệu đầu vào (Input validation).
- [ ] Kết nối Cơ sở dữ liệu (Dự kiến PostgreSQL) và viết hàm Lưu/Đọc dữ liệu.
- [ ] Viết API test cơ bản cho một luồng hợp lệ và một luồng không hợp lệ.

## 4. Tích hợp AI (AI Core Feature)
- [ ] Viết Service gọi API mô hình LLM từ bên trong Back-end.
- [ ] Xử lý định dạng dữ liệu AI trả về (Đầu ra có cấu trúc - JSON Structured Output).
- [ ] Cài đặt cơ chế phòng vệ (Safe fallback) khi model sập hoặc quá hạn thời gian.
- [ ] Tạo file đánh giá (20 test cases) để đo lường độ chính xác và Guardrails.
- [ ] Cập nhật file `docs/ai-usage-log.md` ghi nhận sự trợ giúp của AI.

## 5. Lịch sử công việc (Changelog gần nhất)
- Đã Refactor tách `App.tsx` thành các Component (Sidebar) và Pages (DocumentManager, AIChatAssistant) riêng biệt.
- Đã chốt file `docs/USER_STORIES.md` làm bảng truy vết (Traceability table) cho Milestone 1.