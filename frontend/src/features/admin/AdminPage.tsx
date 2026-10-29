import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LoadingBlock } from '../../shared/components/LoadingBlock';
import { Modal } from '../../shared/components/Modal';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatDateTime, formatUsd } from '../../shared/utils/format';
import { adminApi } from './admin.api';
import type { AiLogEntry, MetricsOverview } from './admin.types';
import './admin.css';

export default function AdminPage() {
  const [data, setData] = useState<MetricsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AiLogEntry | null>(null);

  const loadMetrics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await adminApi.fetchMetrics(100);
      setData(result);
      if (isManual) toast.success('Đã làm mới dữ liệu thống kê.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu quản trị.';
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading || !data) {
    return <LoadingBlock message="Đang tải dữ liệu giám sát hệ thống..." />;
  }

  const { totals, byEndpoint, recent } = data;

  const filteredLogs = recent.filter((log) => {
    if (statusFilter === 'ALL') return true;
    return log.status === statusFilter;
  });

  // Calculate max requests for SVG bar chart scaling
  const maxRequests = Math.max(...byEndpoint.map((e) => e.requests), 1);

  return (
    <div className="admin-container">
      <div className="flex justify-between items-center">
        <PageHeader
          title="Bảng điều khiển Quản trị & Giám sát AI"
          description="Theo dõi chi phí token, thời gian phản hồi (latency), tỷ lệ từ chối/lỗi và nhật ký tương tác AI theo thời gian thực."
        />
        <button
          className="btn btn-secondary"
          onClick={() => loadMetrics(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Đang tải...' : '🔄 Làm mới'}
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Tổng số lượt gọi AI</span>
          <div className="kpi-value">{totals.requests}</div>
          <span className="kpi-subtext">Trên toàn bộ các endpoint</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Độ trễ trung bình</span>
          <div className="kpi-value">{totals.avgLatencyMs} ms</div>
          <span className="kpi-subtext">Bao gồm Embedding & RAG Gen</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Tổng chi phí ước tính</span>
          <div className="kpi-value" style={{ color: 'var(--color-primary)' }}>
            {formatUsd(totals.totalCostUsd)}
          </div>
          <span className="kpi-subtext">Đã tiêu thụ {totals.totalTokens.toLocaleString()} tokens</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Trạng thái Từ chối / Lỗi</span>
          <div className="kpi-value">
            <span style={{ color: 'var(--color-warning)' }}>{totals.refused}</span> /{' '}
            <span style={{ color: 'var(--color-danger)' }}>{totals.errors}</span>
          </div>
          <span className="kpi-subtext">Refused (Nội dung ngoài phạm vi) / Errors</span>
        </div>
      </div>

      {/* Endpoint Analysis & SVG Chart */}
      <div className="admin-section">
        <div className="admin-section-title">
          <span>Phân tích lưu lượng theo Endpoint</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="table-responsive">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Lượt gọi</th>
                  <th>Độ trễ TB</th>
                  <th>Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {byEndpoint.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted p-4">
                      Chưa có dữ liệu thống kê endpoint.
                    </td>
                  </tr>
                ) : (
                  byEndpoint.map((ep) => (
                    <tr key={ep.endpoint}>
                      <td>
                        <code>{ep.endpoint}</code>
                      </td>
                      <td>
                        <strong>{ep.requests}</strong>
                      </td>
                      <td>{ep.avgLatencyMs} ms</td>
                      <td>{formatUsd(ep.totalCostUsd)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* SVG Visual Bar Chart */}
          <div className="chart-wrapper">
            {byEndpoint.length === 0 ? (
              <span className="text-muted text-sm">Chưa có dữ liệu hiển thị biểu đồ</span>
            ) : (
              <svg className="chart-svg" viewBox="0 0 450 160">
                {byEndpoint.map((ep, idx) => {
                  const barWidth = 40;
                  const gap = 60;
                  const x = 50 + idx * (barWidth + gap);
                  const barHeight = (ep.requests / maxRequests) * 100;
                  const y = 120 - barHeight;

                  return (
                    <g key={ep.endpoint}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="4"
                        fill="var(--color-primary)"
                        opacity="0.85"
                      />
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="var(--color-text)"
                      >
                        {ep.requests}
                      </text>
                      <text
                        x={x + barWidth / 2}
                        y="142"
                        textAnchor="middle"
                        fontSize="10"
                        fill="var(--color-text-muted)"
                      >
                        {ep.endpoint.replace('/api/', '')}
                      </text>
                    </g>
                  );
                })}
                <line x1="20" y1="120" x2="430" y2="120" stroke="var(--color-border)" strokeWidth="1" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Recent AI Interaction Logs */}
      <div className="admin-section">
        <div className="admin-section-title">
          <span>Nhật ký Gọi AI Gần đây ({filteredLogs.length})</span>
          <div className="flex gap-2 items-center text-sm font-normal">
            <span>Bộ lọc trạng thái:</span>
            <select
              className="form-input text-xs"
              style={{ width: 'auto', padding: '4px 8px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả ({recent.length})</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="REFUSED">REFUSED</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
        </div>

        <div className="logs-table-wrapper">
          <table className="logs-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Endpoint</th>
                <th>Trạng thái</th>
                <th>Mô hình</th>
                <th>Độ trễ</th>
                <th>Tokens</th>
                <th>Chi phí</th>
                <th>Thời gian</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center text-muted p-4">
                    Không có bản ghi nhật ký phù hợp.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>
                    <td>{log.userEmail ?? 'Hệ thống'}</td>
                    <td>
                      <code>{log.endpoint}</code>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          log.status === 'SUCCESS'
                            ? 'badge-success'
                            : log.status === 'REFUSED'
                              ? 'badge-warning'
                              : 'badge-danger'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td>{log.model ?? '-'}</td>
                    <td>{log.latencyMs} ms</td>
                    <td>{log.promptTokens + log.completionTokens}</td>
                    <td>{formatUsd(log.costUsd)}</td>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>
                      <button
                        className="log-detail-btn"
                        onClick={() => setSelectedLog(log)}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        title={`Chi tiết Nhật ký Gọi AI #${selectedLog?.id}`}
        onClose={() => setSelectedLog(null)}
      >
        {selectedLog && (
          <div className="log-modal-content">
            <div className="log-modal-field">
              <span className="log-modal-label">Người dùng:</span>
              <span>{selectedLog.userEmail ?? 'Không xác định'} (ID: {selectedLog.userId ?? 'None'})</span>
            </div>

            <div className="log-modal-field">
              <span className="log-modal-label">Endpoint & Mô hình:</span>
              <span>
                <code>{selectedLog.endpoint}</code> — Model: {selectedLog.model ?? 'N/A'}
              </span>
            </div>

            <div className="log-modal-field">
              <span className="log-modal-label">Prompt Snippet (Đoạn trích truy vấn):</span>
              <div className="log-modal-box">{selectedLog.promptSnippet || '(Trống)'}</div>
            </div>

            {selectedLog.errorMessage && (
              <div className="log-modal-field">
                <span className="log-modal-label" style={{ color: 'var(--color-danger)' }}>
                  Thông báo lỗi:
                </span>
                <div className="log-modal-box" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                  {selectedLog.errorMessage}
                </div>
              </div>
            )}

            <div className="flex justify-between text-xs text-muted pt-2 border-t">
              <span>Độ trễ: {selectedLog.latencyMs} ms</span>
              <span>
                Prompt Tokens: {selectedLog.promptTokens} | Completion Tokens: {selectedLog.completionTokens}
              </span>
              <span>Chi phí: {formatUsd(selectedLog.costUsd)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
