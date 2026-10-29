# create_sample_pdf.py
import os
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def build_pdf(output_path: str):
    # Register Arial fonts for clean Vietnamese Unicode rendering
    pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Italic', 'C:/Windows/Fonts/ariali.ttf'))

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=18,
        leading=24,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=1, # Center
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#3b82f6'),
        alignment=1,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=14,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Arial-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1e40af'),
        spaceBefore=10,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Arial',
        fontSize=10,
        leading=14.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'Body_Bold_Custom',
        parent=body_style,
        fontName='Arial-Bold'
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        bulletIndent=5,
        spaceAfter=4
    )

    story = []

    # Header / Title
    story.append(Paragraph("TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN - KHOA CÔNG NGHỆ THÔNG TIN", subtitle_style))
    story.append(Paragraph("GIÁO TRÌNH VÀ TÀI LIỆU HƯỚNG DẪN ÔN TẬP HỌC PHẦN", title_style))
    story.append(Paragraph("CÔNG NGHỆ MỚI: HỆ THỐNG TRỢ LÝ HỌC TẬP THÔNG MINH (COURSE ASSISTANT AI)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3b82f6'), spaceAfter=15))

    # Phần 1
    story.append(Paragraph("1. THÔNG TIN CHUNG VỀ HỌC PHẦN", h1_style))
    info_data = [
        [Paragraph("<b>Mã học phần:</b>", body_style), Paragraph("CS305 - Công nghệ Mới & Hệ thống AI RAG", body_style)],
        [Paragraph("<b>Số tín chỉ:</b>", body_style), Paragraph("03 tín chỉ (30 tiết lý thuyết + 30 tiết thực hành)", body_style)],
        [Paragraph("<b>Giảng viên phụ trách:</b>", body_style), Paragraph("TS. Nguyễn Văn An (Khoa Công nghệ Thông tin)", body_style)],
        [Paragraph("<b>Trợ giảng hỗ trợ:</b>", body_style), Paragraph("ThS. Lê Thị Bình (Email: binh.le@university.edu.vn)", body_style)],
        [Paragraph("<b>Đối tượng áp dụng:</b>", body_style), Paragraph("Sinh viên năm 3 và năm 4 chuyên ngành Công nghệ Thông tin, Kỹ thuật Phần mềm và Trí tuệ Nhân tạo.", body_style)],
        [Paragraph("<b>Mục tiêu chính:</b>", body_style), Paragraph("Trang bị kiến thức chuyên sâu về mô hình ngôn ngữ lớn (LLM), kỹ thuật mở rộng tăng cường truy xuất dữ liệu (RAG), kiến trúc phần mềm Clean Architecture và quy chuẩn bảo mật xác thực hiện đại.", body_style)]
    ]
    info_table = Table(info_data, colWidths=[130, 385])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 10))

    # Phần 2: Quy định & Thang điểm
    story.append(Paragraph("2. QUY ĐỊNH HỌC PHẦN VÀ TIÊU CHÍ ĐÁNH GIÁ ĐIỂM SỐ", h1_style))
    story.append(Paragraph("Điểm tổng kết của học phần được tính toán theo tỷ lệ phần trăm các cột điểm thành phần như sau:", body_style))
    
    score_data = [
        [Paragraph("<b>Hạng mục đánh giá</b>", body_bold), Paragraph("<b>Tỷ lệ</b>", body_bold), Paragraph("<b>Yêu cầu & Tiêu chí</b>", body_bold)],
        [Paragraph("Điểm chuyên cần", body_style), Paragraph("10%", body_style), Paragraph("Tham gia tối thiểu 80% số buổi học và thảo luận tại lớp.", body_style)],
        [Paragraph("Đồ án giữa kỳ", body_style), Paragraph("30%", body_style), Paragraph("Xây dựng module phân đoạn tài liệu (Chunking) và lưu trữ vector tương đồng.", body_style)],
        [Paragraph("Đồ án cuối kỳ", body_style), Paragraph("60%", body_style), Paragraph("Xây dựng hoàn chỉnh ứng dụng Web Course Assistant có RAG Streaming, Google OAuth2 và Trắc nghiệm tự động.", body_style)]
    ]
    score_table = Table(score_data, colWidths=[120, 55, 340])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e7ff')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Các mốc thời gian quan trọng:</b>", body_bold))
    story.append(Paragraph("• <b>Mốc 1 (Tuần 4):</b> Hoàn thành thiết kế kiến trúc Hexagonal / Clean Architecture và mô hình dữ liệu SQLite.", bullet_style))
    story.append(Paragraph("• <b>Mốc 2 (Tuần 8):</b> Nộp đồ án giữa kỳ (Đánh giá khả năng cắt chunk và tìm kiếm tương đồng vector).", bullet_style))
    story.append(Paragraph("• <b>Mốc 3 (Hạn chót cuối kỳ):</b> Đúng <b>23 giờ 59 phút ngày 30 tháng 11 năm 2026</b>. Nộp toàn bộ mã nguồn, tài liệu kiểm thử và video báo cáo.", bullet_style))
    story.append(Paragraph("• <b>Chính sách nộp trễ:</b> Mỗi 24 giờ nộp muộn sẽ bị trừ 10% tổng số điểm. Bài nộp sau 72 giờ không được chấp nhận.", bullet_style))
    story.append(Paragraph("• <b>Quy định liêm chính học thuật:</b> Nghiêm cấm mọi hành vi sao chép đồ án giữa các nhóm. Đồ án bị phát hiện đạo văn từ 25% trở lên sẽ nhận điểm 0 tuyệt đối và kỷ luật học vụ.", bullet_style))

    story.append(Spacer(1, 10))

    # Phần 3: Lý thuyết RAG
    story.append(Paragraph("3. CÔNG NGHỆ CỐT LÕI: HỆ THỐNG RAG (RETRIEVAL-AUGMENTED GENERATION)", h1_style))
    story.append(Paragraph("RAG là kỹ thuật hiện đại kết hợp sức mạnh của Mô hình Ngôn ngữ Lớn (LLM) với cơ chế tìm kiếm dữ liệu bên ngoài. Kiến trúc này giải quyết triệt để vấn đề 'ảo giác' (hallucination) của AI và khắc phục hạn chế về dữ liệu huấn luyện lỗi thời.", body_style))
    
    story.append(Paragraph("<b>Quy trình xử lý RAG gồm 3 giai đoạn tiêu chuẩn:</b>", body_bold))
    story.append(Paragraph("1. <b>Giai đoạn nạp và cắt nhỏ (Ingestion & Chunking):</b> Tài liệu PDF hoặc giáo trình được trích xuất văn bản thô. Hệ thống sử dụng thuật toán phân đoạn đệ quy với kích thước tiêu chuẩn là <b>500 ký tự mỗi chunk</b>, độ chồng lấp (overlap) là <b>100 ký tự</b>. Độ chồng lấp này có nhiệm vụ quan trọng là bảo toàn ngữ cảnh và mối liên hệ ngữ nghĩa giữa các ranh giới đoạn cắt.", bullet_style))
    story.append(Paragraph("2. <b>Giai đoạn nhúng vector và lưu trữ (Embedding & Vector Storage):</b> Mỗi đoạn văn bản sau khi cắt được chuyển qua mô hình Embedding (ví dụ Google Gemini Embedding) để tạo thành vector số thực biểu diễn ngữ nghĩa trong không gian nhiều chiều. Độ tương đồng giữa câu hỏi và đoạn văn bản được tính bằng công thức Cosine Similarity:", bullet_style))
    story.append(Paragraph("   <i>Cosine Similarity = (A · B) / (||A|| × ||B||)</i>, với giá trị dao động từ -1.0 đến +1.0. Hệ thống chỉ lấy các đoạn có độ tương đồng tối thiểu từ 0.65 trở lên.", bullet_style))
    story.append(Paragraph("3. <b>Giai đoạn tạo câu trả lời (Augmentation & Generation):</b> Các đoạn văn bản liên quan nhất (Top chunks) được ghép vào Prompt cùng với câu hỏi của người dùng và gửi tới mô hình AI (như Gemini Flash). AI được chỉ thị nghiêm ngặt: chỉ sử dụng thông tin trong ngữ cảnh được cung cấp để trả lời; nếu tài liệu không đề cập thì phải từ chối rõ ràng.", bullet_style))

    story.append(PageBreak())

    # Trang 2
    story.append(Paragraph("4. KIẾN TRÚC PHẦN MỀM CLEAN ARCHITECTURE (PORTS & ADAPTERS)", h1_style))
    story.append(Paragraph("Hệ thống Course Assistant được xây dựng tuân thủ chặt chẽ mô hình Clean Architecture (Kiến trúc Lục giác - Hexagonal Architecture) nhằm đảm bảo tính độc lập, dễ kiểm thử và dễ bảo trì.", body_style))
    
    arch_data = [
        [Paragraph("<b>Tầng kiến trúc</b>", body_bold), Paragraph("<b>Vai trò và Trách nhiệm</b>", body_bold)],
        [Paragraph("Domain Entities", body_style), Paragraph("Chứa các kiểu dữ liệu và thực thể nghiệp vụ cốt lõi (User, Document, Chunk, QuizQuestion). Không phụ thuộc bất kỳ framework hay thư viện bên ngoài nào.", body_style)],
        [Paragraph("Use Cases / Services", body_style), Paragraph("Chứa logic nghiệp vụ ứng dụng: DocumentService, ChatService, QuizService, AuthService. Chỉ phụ thuộc vào các giao diện trừu tượng (Ports).", body_style)],
        [Paragraph("Ports (Giao diện)", body_style), Paragraph("Các hợp đồng giao tiếp trừu tượng: LlmClient, EmbeddingClient, VectorIndex, UserRepository, DocumentRepository.", body_style)],
        [Paragraph("Adapters & Infrastructure", body_style), Paragraph("Triển khai chi tiết phần cứng và công nghệ: GeminiClient, SQLiteDatabase, InMemoryVectorIndex, Express Controller, GoogleAuthVerifier.", body_style)]
    ]
    arch_table = Table(arch_data, colWidths=[140, 375])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e7ff')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Lợi ích cốt lõi của nguyên tắc Đảo ngược Phụ thuộc (Dependency Inversion):</b>", body_bold))
    story.append(Paragraph("• <b>Khả năng hoán đổi nhà cung cấp (Swappable Providers):</b> Có thể chuyển đổi nhà cung cấp AI từ Google Gemini sang OpenAI GPT hoặc Claude mà không cần viết lại mã logic nghiệp vụ của ChatService.", bullet_style))
    story.append(Paragraph("• <b>Khả năng kiểm thử tự động (Testability):</b> Dễ dàng viết các bài Unit Test với 100% tốc độ thực thi bằng cách đưa vào FakeLlmClient hoặc FakeVectorIndex mà không tốn chi phí gọi API thực tế.", bullet_style))
    story.append(Paragraph("• <b>Độc lập cơ sở dữ liệu:</b> Tầng dữ liệu có thể chuyển đổi mượt mà từ SQLite sang PostgreSQL hoặc Cloud Spanner khi triển khai quy mô lớn.", bullet_style))

    story.append(Spacer(1, 10))

    # Phần 5: Bảo mật
    story.append(Paragraph("5. BẢO MẬT HỆ THỐNG VÀ XÁC THỰC NGƯỜI DÙNG", h1_style))
    story.append(Paragraph("• <b>Cơ chế xác thực Google OAuth 2.0:</b> Phía Frontend đăng nhập và lấy về chuỗi Google ID Token. Phía Backend sử dụng thư viện chính thức <code>google-auth-library</code> để giải mã, kiểm tra chữ ký số công khai từ máy chủ Google, kiểm tra tính hợp lệ của Audience (Google Client ID) và thời hạn hết hạn (Expiration).", bullet_style))
    story.append(Paragraph("• <b>Quản lý phiên làm việc qua JWT (JSON Web Token):</b> Sau khi người dùng được xác thực, Backend phát hành JWT Token với thuật toán mã hóa <b>HS256</b>, thời hạn phiên làm việc hợp lệ trong <b>7 ngày</b>. Token này được đính kèm ở Header <code>Authorization: Bearer [token]</code> trong mọi yêu cầu tiếp theo.", bullet_style))
    story.append(Paragraph("• <b>Cách ly dữ liệu người dùng (Data Isolation):</b> Hệ thống áp dụng nguyên tắc Multi-tenancy phân tách dữ liệu tuyệt đối theo <code>userId</code>. Sinh viên A hoàn toàn không thể xem tài liệu, lịch sử hội thoại hoặc làm đề ôn tập trên tài liệu của Sinh viên B.", bullet_style))
    story.append(Paragraph("• <b>Phân quyền theo vai trò (Role-Based Access Control - RBAC):</b> Người dùng được phân thành hai nhóm vai trò: vai trò <code>student</code> (sinh viên) được quyền hỏi đáp, quản lý tài liệu cá nhân, làm trắc nghiệm; vai trò <code>admin</code> (quản trị viên) có thêm quyền truy cập trang quản trị hệ thống để theo dõi bảng số liệu tiêu thụ token AI và chi phí hoạt động theo thời gian thực.", bullet_style))

    story.append(Spacer(1, 10))

    # Phần 6: Tóm tắt
    story.append(Paragraph("6. TÓM TẮT NỘI DUNG TRỌNG TÂM TRONG 3 CÂU", h1_style))
    story.append(Paragraph("Tài liệu này hướng dẫn toàn diện cấu trúc học phần CS305 và công nghệ xây dựng trợ lý học tập AI sử dụng kỹ thuật RAG kết hợp Clean Architecture. Hệ thống phân đoạn tài liệu thành các khối 500 ký tự (overlap 100 ký tự), nhúng vector để tìm kiếm ngữ nghĩa chính xác và trả lời câu hỏi dựa trên ngữ cảnh thực tế. Toàn bộ giải pháp được bảo vệ bởi xác thực Google OAuth2, phiên làm việc JWT 7 ngày và cơ chế cách ly dữ liệu độc lập theo từng tài khoản.", body_style))

    doc.build(story)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == '__main__':
    target_dir = os.path.join(os.getcwd(), 'sample_documents')
    os.makedirs(target_dir, exist_ok=True)
    target_file = os.path.join(target_dir, 'Giao_Trinh_Nhap_Mon_AI_va_He_Thong_RAG.pdf')
    build_pdf(target_file)
