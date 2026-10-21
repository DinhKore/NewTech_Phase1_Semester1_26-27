# DANH SÁCH KỊCH BẢN NGƯỜI DÙNG (USER STORIES)
**Dự án:** Trợ lý Học tập AI (Course Assistant)
**Mục tiêu (M1):** 15 User Stories kèm Acceptance Criteria (Tiêu chí nghiệm thu)

| ID | Phân hệ | Kịch bản (Là một [Vai trò], tôi muốn [Hành động] để [Mục đích]) | Acceptance Criteria (Tiêu chí nghiệm thu / Cách test thực tế) |
| :--- | :--- | :--- | :--- |
| **US01** | Auth | Là người dùng, tôi muốn đăng nhập bằng Google (OAuth2) để truy cập hệ thống nhanh chóng. | Bấm "Login", chọn tài khoản Google, hệ thống cấp JWT token và chuyển hướng vào Trang chủ. |
| **US02** | Auth | Là quản trị viên, tôi muốn có quyền Admin phân biệt với User thường để quản lý hệ thống. | User thường không thấy menu "Admin Dashboard". Truy cập link admin bằng User thường sẽ bị chặn (HTTP 403). |
| **US03** | CRUD | Là sinh viên, tôi muốn tải file bài giảng (PDF/Docx) lên để AI có thể đọc. | File < 5MB upload thành công báo "Success". File > 5MB hoặc sai định dạng báo lỗi đỏ trên UI. |
| **US04** | CRUD | Là sinh viên, tôi muốn xem danh sách và xóa file đã tải để quản lý không gian lưu trữ. | Hiển thị bảng danh sách file. Bấm "Xóa" -> Màn hình hiện "Đã xóa", dữ liệu trong DB bị xóa. |
| **US05** | AI (RAG) | Là sinh viên, tôi muốn đặt câu hỏi và nhận câu trả lời từ AI dựa trên file đã up. | Hỏi "Nội dung chương 1 là gì?", AI tóm tắt đúng nội dung nằm trong file PDF hiện tại. |
| **US06** | UI/UX | Là người dùng, tôi muốn thấy trạng thái Loading/Streaming khi chờ AI trả lời. | Khi gửi câu hỏi, UI khóa nút gửi, hiện icon ⏳, sau đó chữ hiện ra từng từ (streaming token). |
| **US07** | RAG | Là sinh viên, tôi muốn thấy **nguồn trích dẫn** dưới câu trả lời của AI để kiểm chứng. | Cuối câu trả lời của AI bắt buộc có dòng "Trích từ: Tên_File.pdf". |
| **US08** | Guardrail | Là hệ thống, tôi muốn AI **từ chối** trả lời các câu hỏi ngoài lề/độc hại. | Hỏi "Làm sao để hack web?", AI đáp: "Xin lỗi, tôi chỉ hỗ trợ giải đáp kiến thức bài học". |
| **US09** | Guardrail | Là hệ thống, tôi muốn AI **không bịa chuyện** (Hallucination) khi thiếu dữ liệu. | Hỏi một khái niệm không có trong file. AI đáp: "Tài liệu hiện tại không đề cập nội dung này". |
| **US10** | AI (JSON)| Là sinh viên, tôi muốn yêu cầu AI tạo **bài tập trắc nghiệm** để ôn tập. | Bấm "Tạo Test", AI trả về đúng định dạng JSON. Giao diện frontend tự render thành bộ câu hỏi A B C D. |
| **US11** | Fallback | Là người dùng, tôi muốn thấy thông báo lỗi lịch sự khi AI Server gặp sự cố. | Tắt mạng hoặc API Key hết tiền. UI không bị trắng trang mà hiện popup: "Hệ thống AI đang bận". |
| **US12** | Database| Là sinh viên, tôi muốn lịch sử chat được lưu trữ vĩnh viễn (Persistent). | F5 tải lại trang hoặc đăng nhập máy khác, lịch sử đoạn chat cũ vẫn còn nguyên (fetch từ PostgreSQL). |
| **US13** | UI/UX | Là người dùng, tôi muốn sử dụng web trơn tru trên màn hình điện thoại (Responsive). | Thu nhỏ trình duyệt bằng kích thước Mobile, menu Sidebar tự động chuyển thành nút Hamburger góc màn hình. |
| **US14** | Admin | Là quản trị viên, tôi muốn xem Dashboard thống kê số lượng token và chi phí AI. | Admin truy cập Dashboard thấy biểu đồ: Số request, chi phí USD, thời gian phản hồi trung bình (latency). |
| **US15** | Security | Là hệ thống, tôi muốn đảm bảo người dùng chỉ xem được dữ liệu của chính mình. | Đăng nhập User A, tuyệt đối không query được file bài giảng và lịch sử chat của User B. |

> **Lưu ý chấm điểm:** Bảng này sẽ được dùng làm Traceability Table ở các tuần tiếp theo. Cột ID sẽ được map trực tiếp với tên API Endpoint và hàm trong Source Code.