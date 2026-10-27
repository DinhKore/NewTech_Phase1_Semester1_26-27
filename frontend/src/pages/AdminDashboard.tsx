// frontend/src/pages/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface MetricData {
    totalRequests: number;
    avgLatency: number;
    totalCostUSD: number;
    refusedOrFailed: number;
    recentLogs: Array<{
        id: number;
        endpoint: string;
        prompt_snippet: string;
        latency_ms: number;
        tokens: number;
        cost_usd: number;
        status: string;
        created_at: string;
    }>;
}

const AdminDashboard = () => {
    const [metrics, setMetrics] = useState<MetricData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedLog, setSelectedLog] = useState<any | null>(null);

    const fetchMetrics = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('http://localhost:3000/api/admin/metrics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
            } else if (res.status === 403) {
                toast.error("Bạn không có quyền quản trị viên.");
            }
        } catch (e) {
            console.error("Lỗi lấy metrics admin");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) return <div style={{ padding: '40px', color: '#64748b' }}>⏳ Đang tải số liệu quan sát hệ thống...</div>;

    // Lọc log theo tìm kiếm và trạng thái
    const filteredLogs = (metrics?.recentLogs || []).filter(log => {
        const matchSearch = log.prompt_snippet.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.endpoint.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'ALL' || log.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // Tọa độ vẽ Line Chart trực quan
    const chartLogs = [...(metrics?.recentLogs || [])].reverse().slice(-10);
    const maxLat = Math.max(...chartLogs.map(l => l.latency_ms), 1000);

    return (
        <div style={{ padding: '30px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>

            {/* HEADER & REFRESH */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '22px' }}>📊 Bảng Điều Khiển Quản Trị (Admin Dashboard)</h2>
                    <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '14px' }}>Giám sát thời gian thực: Hiệu năng AI, Chi phí và Guardrails</p>
                </div>
                <button
                    onClick={() => { fetchMetrics(); toast.success("Đã làm mới dữ liệu!"); }}
                    style={{ background: '#0284c7', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                    🔄 Làm mới dữ liệu
                </button>
            </div>

            {/* 4 THẺ CHỈ SỐ KPI VỚI ICON TRỰC QUAN */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #0284c7', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>TỔNG YÊU CẦU AI</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{metrics?.totalRequests}</div>
                    </div>
                    <span style={{ fontSize: '32px' }}>📈</span>
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #10b981', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>ĐỘ TRỄ TRUNG BÌNH</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#065f46', marginTop: '4px' }}>{metrics?.avgLatency} ms</div>
                    </div>
                    <span style={{ fontSize: '32px' }}>⚡</span>
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #f59e0b', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>ƯỚC TÍNH CHI PHÍ API</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#854d0e', marginTop: '4px' }}>${metrics?.totalCostUSD}</div>
                    </div>
                    <span style={{ fontSize: '32px' }}>💵</span>
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #ef4444', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>TỪ CHỐI / THẤT BẠI</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#991b1b', marginTop: '4px' }}>{metrics?.refusedOrFailed}</div>
                    </div>
                    <span style={{ fontSize: '32px' }}>🔴</span>
                </div>
            </div>

            {/* BIỂU ĐỒ ĐƯỜNG (LINE CHART) MINH HỌA ĐỘ TRỄ THỜI GIAN THỰC */}
            <div style={{ marginBottom: '36px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#334155', fontSize: '15px' }}>📉 Biến Động Độ Trễ Phản Hồi (Latency Tracker)</h4>
                {chartLogs.length > 0 ? (
                    <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '16px', paddingBottom: '10px' }}>
                        {chartLogs.map((log, i) => {
                            const heightPercent = Math.max(15, Math.min(100, (log.latency_ms / maxLat) * 100));
                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                    <span style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>{log.latency_ms}ms</span>
                                    <div style={{
                                        width: '100%',
                                        maxWidth: '36px',
                                        height: `${heightPercent}%`,
                                        background: log.status === 'SUCCESS' ? '#38bdf8' : '#f87171',
                                        borderRadius: '6px 6px 0 0',
                                        transition: 'height 0.3s'
                                    }} />
                                    <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>#{log.id}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>Chưa có đủ điểm dữ liệu để vẽ biểu đồ.</div>
                )}
            </div>

            {/* KHU VỰC TÌM KIẾM & BỘ LỌC AUDIT LOG */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ color: '#1e293b', margin: 0, fontSize: '16px' }}>📝 Nhật Ký Yêu Cầu Gần Nhất (Audit Log)</h3>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Tìm theo prompt hoặc endpoint..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', width: '220px', outline: 'none' }}
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: 'white' }}
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="SUCCESS">SUCCESS</option>
                        <option value="REFUSED">REFUSED</option>
                        <option value="ERROR">ERROR</option>
                    </select>
                </div>
            </div>

            {/* BẢNG LOG CHI TIẾT */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <tr>
                            <th style={{ padding: '12px 16px' }}>Thời gian</th>
                            <th style={{ padding: '12px 16px' }}>Endpoint</th>
                            <th style={{ padding: '12px 16px' }}>Nội dung truy vấn</th>
                            <th style={{ padding: '12px 16px' }}>Độ trễ</th>
                            <th style={{ padding: '12px 16px' }}>Tokens</th>
                            <th style={{ padding: '12px 16px' }}>Chi phí</th>
                            <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(log.created_at).toLocaleTimeString('vi-VN')}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#0369a1' }}>{log.endpoint}</td>
                                    <td style={{ padding: '12px 16px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {log.prompt_snippet}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>{log.latency_ms} ms</td>
                                    <td style={{ padding: '12px 16px' }}>{log.tokens}</td>
                                    <td style={{ padding: '12px 16px' }}>${log.cost_usd}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold',
                                            background: log.status === 'SUCCESS' ? '#dcfce7' : log.status === 'REFUSED' ? '#fef9c3' : '#fee2e2',
                                            color: log.status === 'SUCCESS' ? '#166534' : log.status === 'REFUSED' ? '#854d0e' : '#991b1b'
                                        }}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                                        >
                                            Chi tiết
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Không tìm thấy bản ghi log nào phù hợp.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL XEM CHI TIẾT LOG CHO ADMIN */}
            {selectedLog && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: 'white', padding: '28px', borderRadius: '16px', width: '560px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🔍 Chi Tiết Yêu Cầu #{selectedLog.id}</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155' }}>
                            <div><b>Endpoint:</b> <code>{selectedLog.endpoint}</code></div>
                            <div><b>Trạng thái:</b> <b>{selectedLog.status}</b></div>
                            <div><b>Thời gian phản hồi:</b> {selectedLog.latency_ms} ms</div>
                            <div><b>Ước tính Token:</b> {selectedLog.tokens} tokens</div>
                            <div><b>Chi phí phát sinh:</b> ${selectedLog.cost_usd} USD</div>
                            <div>
                                <b>Trích đoạn Prompt / Câu hỏi:</b>
                                <div style={{ marginTop: '6px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '180px', overflowY: 'auto' }}>
                                    {selectedLog.prompt_snippet}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', textAlign: 'right' }}>
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{ padding: '8px 18px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminDashboard;