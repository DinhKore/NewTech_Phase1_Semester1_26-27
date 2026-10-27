// frontend/src/pages/QuizReview.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';

interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
}

const QuizReview = () => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [score, setScore] = useState<number | null>(null);

    const handleGenerateQuiz = async () => {
        setIsLoading(true);
        setIsSubmitted(false);
        setUserAnswers({});
        setScore(null);

        try {
            const response = await fetch('http://localhost:3000/api/quiz', {
                method: 'POST',
            });
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Lỗi tạo bài trắc nghiệm");
            } else {
                setQuestions(data.quiz);
                toast.success("Đã tạo đề trắc nghiệm thành công!");
            }
        } catch (err) {
            toast.error("Không thể kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectOption = (questionId: number, optionLetter: string) => {
        if (isSubmitted) return;
        setUserAnswers(prev => ({ ...prev, [questionId]: optionLetter }));
    };

    const handleSubmitQuiz = () => {
        if (Object.keys(userAnswers).length < questions.length) {
            toast.error("Vui lòng trả lời hết tất cả các câu hỏi!");
            return;
        }

        let correctCount = 0;
        questions.forEach(q => {
            if (userAnswers[q.id] === q.answer) correctCount++;
        });

        setScore(correctCount);
        setIsSubmitted(true);
        toast.success(`Hoàn thành! Bạn đúng ${correctCount}/${questions.length} câu.`);
    };

    return (
        <div style={{ padding: '30px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ marginTop: 0, color: '#1e293b', fontSize: '22px' }}>📝 Ôn Tập Trắc Nghiệm Thông Minh</h2>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>AI đọc tài liệu bài giảng đã nạp và tự động sinh bài trắc nghiệm cấu trúc JSON.</p>
                </div>

                <button
                    onClick={handleGenerateQuiz}
                    disabled={isLoading}
                    style={{
                        background: isLoading ? '#94a3b8' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '12px 22px',
                        borderRadius: '10px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    {isLoading ? '⏳ Đang phân tích...' : '✨ Tạo Đề Trắc Nghiệm Mới'}
                </button>
            </div>

            {/* TRẠNG THÁI SKELETON LOADING KHI ĐANG TẠO */}
            {isLoading && (
                <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0284c7', fontWeight: 'bold', marginBottom: '20px' }}>
                        <span style={{ animation: 'spin 1s linear infinite' }}>🔄</span>
                        <span>AI đang trích xuất dữ liệu và khởi tạo câu hỏi trắc nghiệm chuẩn Structured JSON...</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[1, 2, 3].map(sk => (
                            <div key={sk} style={{ padding: '18px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div style={{ height: '18px', width: '60%', background: '#e2e8f0', borderRadius: '4px', marginBottom: '12px' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={{ height: '36px', background: '#f1f5f9', borderRadius: '6px' }} />
                                    <div style={{ height: '36px', background: '#f1f5f9', borderRadius: '6px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TRẠNG THÁI RỖNG (EMPTY STATE 3 BƯỚC) */}
            {!isLoading && questions.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '56px', marginBottom: '14px' }}>📚</div>
                    <h3 style={{ color: '#1e293b', margin: '0 0 10px 0' }}>Chưa có bài trắc nghiệm nào được tạo</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '480px', margin: '0 auto 28px auto' }}>
                        Hệ thống sử dụng Structured Output để sinh câu hỏi bám sát tài liệu bài giảng. Bắt đầu ngay theo quy trình 3 bước:
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', maxWidth: '720px', margin: '0 auto' }}>
                        <div style={{ flex: 1, minWidth: '180px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '6px' }}>1️⃣</div>
                            <b style={{ fontSize: '13px', color: '#1e293b' }}>Nạp Tài Liệu</b>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Tải PDF bài giảng tại tab Quản lý tài liệu</p>
                        </div>

                        <div style={{ flex: 1, minWidth: '180px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '6px' }}>2️⃣</div>
                            <b style={{ fontSize: '13px', color: '#1e293b' }}>Bấm Tạo Đề</b>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>AI quét Vector và sinh cấu trúc 3 câu hỏi</p>
                        </div>

                        <div style={{ flex: 1, minWidth: '180px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '6px' }}>3️⃣</div>
                            <b style={{ fontSize: '13px', color: '#1e293b' }}>Kiểm Tra Điểm</b>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Làm bài, nộp bài và xem lời giải thích chi tiết</p>
                        </div>
                    </div>
                </div>
            )}

            {/* DANH SÁCH CÂU HỎI */}
            {!isLoading && questions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {questions.map((q, idx) => (
                        <div key={q.id} style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px', background: '#f8fafc' }}>
                            <h4 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px' }}>
                                Câu {idx + 1}: {q.question}
                            </h4>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                                {q.options.map((opt, oIdx) => {
                                    const letter = opt.substring(0, 1);
                                    const isSelected = userAnswers[q.id] === letter;
                                    let btnBg = isSelected ? '#0284c7' : 'white';
                                    let btnColor = isSelected ? 'white' : '#334155';

                                    if (isSubmitted) {
                                        if (letter === q.answer) {
                                            btnBg = '#16a34a';
                                            btnColor = 'white';
                                        } else if (isSelected && letter !== q.answer) {
                                            btnBg = '#dc2626';
                                            btnColor = 'white';
                                        }
                                    }

                                    return (
                                        <button
                                            key={oIdx}
                                            onClick={() => handleSelectOption(q.id, letter)}
                                            style={{
                                                padding: '12px 16px',
                                                textAlign: 'left',
                                                background: btnBg,
                                                color: btnColor,
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                cursor: isSubmitted ? 'default' : 'pointer',
                                                fontSize: '14px',
                                                fontWeight: isSelected ? '600' : '400',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>

                            {isSubmitted && (
                                <div style={{ marginTop: '14px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', color: '#166534' }}>
                                    <b>💡 Giải thích:</b> {q.explanation}
                                </div>
                            )}
                        </div>
                    ))}

                    {!isSubmitted && (
                        <button
                            onClick={handleSubmitQuiz}
                            style={{
                                background: '#10b981', color: 'white', border: 'none', padding: '14px 28px',
                                borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', alignSelf: 'flex-start'
                            }}
                        >
                            Nộp Bài Kiểm Tra
                        </button>
                    )}

                    {isSubmitted && score !== null && (
                        <div style={{ padding: '20px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                            <h3 style={{ margin: 0, color: '#0369a1' }}>
                                🎯 Kết quả: Bạn đạt {score} / {questions.length} câu đúng!
                            </h3>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default QuizReview;