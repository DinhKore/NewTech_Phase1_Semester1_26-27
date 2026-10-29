import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingBlock } from '../../shared/components/LoadingBlock';
import { PageHeader } from '../../shared/components/PageHeader';
import { documentsApi } from '../documents/documents.api';
import type { DocumentItem } from '../documents/documents.types';
import { quizApi } from './quiz.api';
import type { OptionKey, QuizQuestion } from './quiz.types';
import './quiz.css';

export default function QuizPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(undefined);
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [generating, setGenerating] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, OptionKey>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load user's documents for the select dropdown
  useEffect(() => {
    documentsApi
      .list({ limit: 100 })
      .then((res) => {
        setDocuments(res.items);
      })
      .catch(() => {
        // Silently ignore or allow generating across all
      });
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setIsSubmitted(false);
    setUserAnswers({});
    setQuestions([]);

    const toastId = toast.loading('AI đang phân tích tài liệu và khởi tạo câu hỏi trắc nghiệm...');
    try {
      const generated = await quizApi.generate({
        questionCount,
        documentId: selectedDocId,
      });

      if (generated.length === 0) {
        toast.error('Không tìm thấy tài liệu phù hợp để tạo câu hỏi.', { id: toastId });
      } else {
        setQuestions(generated);
        toast.success(`Đã tạo thành công ${generated.length} câu hỏi trắc nghiệm!`, { id: toastId });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tạo trắc nghiệm thất bại.';
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOption = (questionId: number, optionKey: OptionKey) => {
    if (isSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  const handleSubmit = () => {
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < questions.length) {
      const remaining = questions.length - answeredCount;
      if (!window.confirm(`Bạn còn ${remaining} câu chưa trả lời. Bạn có chắc muốn nộp bài?`)) {
        return;
      }
    }
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setUserAnswers({});
    setIsSubmitted(false);
  };

  // Score Calculation
  const correctCount = questions.reduce((acc, q) => {
    return userAnswers[q.id] === q.answer ? acc + 1 : acc;
  }, 0);

  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return (
    <div className="quiz-container">
      <PageHeader
        title="Trắc nghiệm & Ôn tập Kiến thức"
        description="Tự động trích xuất các luận điểm quan trọng trong giáo trình để tạo bộ đề trắc nghiệm khách quan 4 lựa chọn có kèm lời giải chi tiết."
      />

      {/* Setup Form */}
      <div className="quiz-setup-card">
        <div className="quiz-setup-form">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Chọn tài liệu nguồn:</label>
            <select
              className="form-input"
              value={selectedDocId ?? ''}
              onChange={(e) => setSelectedDocId(e.target.value ? Number(e.target.value) : undefined)}
              disabled={generating}
            >
              <option value="">-- Tất cả tài liệu học tập --</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename} ({doc.chunksCount} chunks)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Số lượng câu hỏi:</label>
            <select
              className="form-input"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              disabled={generating}
            >
              <option value={3}>3 câu hỏi ngắn (Nhanh)</option>
              <option value={5}>5 câu hỏi tiêu chuẩn</option>
              <option value={10}>10 câu hỏi chuyên sâu</option>
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ height: '42px' }}
          >
            {generating ? 'Đang tạo câu hỏi...' : '⚡ Tạo đề trắc nghiệm'}
          </button>
        </div>
      </div>

      {generating && <LoadingBlock message="AI đang đọc tài liệu và xây dựng các phương án..." />}

      {/* Score Banner when Submitted */}
      {isSubmitted && (
        <div className="quiz-score-banner">
          <span className="score-message">Kết quả bài làm của bạn</span>
          <div className="score-number">{scorePercent}%</div>
          <p>
            Bạn đã trả lời đúng <strong>{correctCount}</strong> / <strong>{questions.length}</strong> câu hỏi.
          </p>
          <div className="flex gap-3 mt-3">
            <button className="btn btn-secondary" onClick={handleReset}>
              🔄 Làm lại bài này
            </button>
            <button className="btn btn-primary" onClick={handleGenerate}>
              ✨ Tạo bộ đề mới
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      {!generating && questions.length === 0 && (
        <EmptyState
          title="Sẵn sàng kiểm tra kiến thức"
          description="Chọn tài liệu hoặc để mặc định, chọn số lượng câu hỏi và nhấn 'Tạo đề trắc nghiệm' để bắt đầu ôn tập."
        />
      )}

      {!generating && questions.length > 0 && (
        <div className="quiz-questions-list">
          {questions.map((q, idx) => {
            const selectedOption = userAnswers[q.id];
            const isCorrect = isSubmitted && selectedOption === q.answer;

            return (
              <div key={q.id} className="quiz-question-card">
                <div className="question-header">
                  <span className="question-badge">Câu {idx + 1}</span>
                  <h3 className="question-text">{q.question}</h3>
                </div>

                <div className="options-grid">
                  {q.options.map((opt) => {
                    let optionClass = 'option-btn';
                    if (!isSubmitted) {
                      if (selectedOption === opt.key) optionClass += ' selected';
                    } else {
                      if (opt.key === q.answer) {
                        optionClass += ' correct';
                      } else if (selectedOption === opt.key) {
                        optionClass += ' incorrect';
                      }
                    }

                    return (
                      <button
                        key={opt.key}
                        className={optionClass}
                        onClick={() => handleSelectOption(q.id, opt.key)}
                        disabled={isSubmitted}
                      >
                        <span className="option-key">{opt.key}</span>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                {isSubmitted && (
                  <div className="explanation-box">
                    <strong>
                      {isCorrect ? '✅ Chính xác!' : '❌ Chưa chính xác.'} Đáp án đúng: {q.answer}
                    </strong>
                    <p className="mt-1">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}

          {!isSubmitted && (
            <div className="flex justify-end gap-3 mt-4">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={questions.length === 0}
              >
                📝 Nộp bài và xem giải thích
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
