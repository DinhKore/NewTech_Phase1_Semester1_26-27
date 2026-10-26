import { useState } from 'react';

// Cấu trúc một câu hỏi khớp 100% với JSON Backend trả về
interface QuestionItem {
    id: number;
    question: string;
    options: string[];
    answer: string; // "A" | "B" | "C" | "D"
    explanation: string;
}

const QuizReview = () => {
    const [quizList, setQuizList] = useState<QuestionItem[]>([]);
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Gọi API sinh đề trắc nghiệm từ Backend
    const handleGenerateQuiz = async () => {
        setIsLoading(true);
        setError(null);
        setIsSubmitted(false);
        setUserAnswers({});
        setQuizList([]);

        try {
            const response = await fetch('http://localhost:3000/api/quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Lỗi khi tạo câu hỏi ôn tập.');
            } else {
                setQuizList(data.quiz);
            }
        } catch (err) {
            setError('Không thể kết nối đến máy chủ Backend.');
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Chọn đáp án
    const handleSelectOption = (questionId: number, selectedLetter: string) => {
        if (isSubmitted) return; // Đã nộp bài thì không cho đổi
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: selectedLetter,
        }));
    };

    // 3. Tính điểm
    const calculateScore = () => {
        let score = 0;
        quizList.forEach(q => {
            if (userAnswers[q.id] === q.answer) {
                score++;
            }
        });
        return score;
    };

    return (
        <div style={{ padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b' }}>📝 Trắc Nghiệm Ôn Tập Tự Động</h2>
                    <p style={{ margin: '5px 0 0', color: '#64748b' }}>AI tự động bóc tách tài liệu bài giảng và sinh đề trắc nghiệm chuẩn xác.</p>
                </div>
                <button
                    onClick={handleGenerateQuiz}
                    disabled={isLoading}
                    style={{
                        background: isLoading ? '#94a3b8' : '#6366f1',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: '15px'
                    }}
                >
                    {isLoading ? '⏳ Đang phân tích & tạo đề...' : '✨ Tạo Đề Trắc Nghiệm'}
                </button>
            </div>

            {/* Trạng thái lỗi */}
            {error && (
                <div style={{ padding: '15px', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold' }}>
                    ❌ {error}
                </div>
            )}

            {/* Trạng thái trống (Empty State) */}
            {!isLoading && quizList.length === 0 && !error && (
                <div style={{ textAlign: 'center', padding: '50px 20px', border: '2px dashed #cbd5e1', borderRadius: '10px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
                        Chưa có bài kiểm tra nào. Nhấn <b>"Tạo Đề Trắc Nghiệm"</b> để AI đọc tài liệu đã nạp và tạo câu hỏi cho bạn.
                    </p>
                </div>
            )}

            {/* Danh sách câu hỏi */}
            {quizList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '20px' }}>
                    {quizList.map((q, idx) => {
                        const chosen = userAnswers[q.id];
                        const isCorrect = chosen === q.answer;

                        return (
                            <div
                                key={q.id}
                                style={{
                                    padding: '20px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    background: isSubmitted ? (isCorrect ? '#f0fdf4' : '#fef2f2') : '#f8fafc'
                                }}
                            >
                                <h4 style={{ margin: '0 0 15px', color: '#1e293b' }}>
                                    Câu {idx + 1}: {q.question}
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {q.options.map(opt => {
                                        const letter = opt.trim().charAt(0); // Lấy chữ cái A, B, C, D
                                        const isSelected = chosen === letter;

                                        let btnBackground = '#ffffff';
                                        let btnBorder = '1px solid #cbd5e1';
                                        let btnColor = '#334155';

                                        if (isSelected) {
                                            btnBackground = '#e0e7ff';
                                            btnBorder = '2px solid #6366f1';
                                            btnColor = '#4338ca';
                                        }

                                        if (isSubmitted) {
                                            if (letter === q.answer) {
                                                btnBackground = '#dcfce7';
                                                btnBorder = '2px solid #22c55e';
                                                btnColor = '#15803d';
                                            } else if (isSelected && letter !== q.answer) {
                                                btnBackground = '#fee2e2';
                                                btnBorder = '2px solid #ef4444';
                                                btnColor = '#b91c1c';
                                            }
                                        }

                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => handleSelectOption(q.id, letter)}
                                                disabled={isSubmitted}
                                                style={{
                                                    textAlign: 'left',
                                                    padding: '12px 15px',
                                                    borderRadius: '8px',
                                                    background: btnBackground,
                                                    border: btnBorder,
                                                    color: btnColor,
                                                    cursor: isSubmitted ? 'default' : 'pointer',
                                                    fontWeight: isSelected ? '600' : 'normal',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Phần giải thích chi tiết khi đã nộp bài */}
                                {isSubmitted && (
                                    <div style={{ marginTop: '15px', padding: '12px', background: 'white', borderRadius: '6px', borderLeft: isCorrect ? '4px solid #22c55e' : '4px solid #ef4444' }}>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
                                            <b>Đáp án chuẩn:</b> {q.answer} <br />
                                            <b>Giải thích:</b> {q.explanation}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Thanh nộp bài và xem điểm */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                        {!isSubmitted ? (
                            <button
                                onClick={() => setIsSubmitted(true)}
                                disabled={Object.keys(userAnswers).length === 0}
                                style={{
                                    background: Object.keys(userAnswers).length === 0 ? '#cbd5e1' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    padding: '12px 30px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: Object.keys(userAnswers).length === 0 ? 'not-allowed' : 'pointer',
                                    fontSize: '16px'
                                }}
                            >
                                Nộp Bài ({Object.keys(userAnswers).length}/{quizList.length})
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                                    🎯 Kết quả: {calculateScore()} / {quizList.length} câu đúng
                                </span>
                                <button
                                    onClick={handleGenerateQuiz}
                                    style={{
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 18px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Làm đề khác
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizReview;