ADR 1: Lựa chọn cơ sở dữ liệu lưu trữ Vector
Quyết định: Chọn SQLite kết hợp mảng lưu Vector trên RAM (MemoryVectorStore/Native Array).

Lý do: Tránh lỗi cấu hình thư viện phức tạp trên Node.js v24 (như từng gặp với thư viện Langchain). SQLite đủ nhẹ để lưu persistent data mà không cần cài đặt hạ tầng như PostgreSQL/pgvector.

ADR 2: Lựa chọn LLM Provider (AI Design)
Quyết định: Sử dụng Google Gemini Flash.

Lý do: Tốc độ phản hồi cực nhanh (Time-to-first-token thấp), chi phí rẻ, bảo mật tốt, phù hợp cho tính năng Streaming.

ADR 3: Cơ chế cập nhật thời gian thực (Real-time)
Quyết định: Sử dụng Server-Sent Events (SSE).

Lý do: Ứng dụng chat chỉ cần server đẩy (push) dữ liệu text liên tục về client một chiều. SSE nhẹ, dễ triển khai qua HTTP hơn WebSockets.