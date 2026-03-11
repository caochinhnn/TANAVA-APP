import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { getLocalDateString } from '../utils/dateUtils';

const Dashboard = () => {
    const [data, setData] = useState({ bar: [], pie: [], orderCount: 0 });
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('month');
    const [selectedCustomerId, setSelectedCustomerId] = useState('all');
    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        fetchData();
    }, [timeFilter, selectedCustomerId]);

    const fetchData = async () => {
        setLoading(true);
        const now = new Date();
        let startDateStr = '';
        let endDateStr = null;

        let query = supabase
            .from('orders')
            .select('order_date, total_amount, status, customers(name, code)');

        if (timeFilter === 'day') {
            startDateStr = getLocalDateString(now);
            endDateStr = startDateStr;
            query = query.gte('order_date', startDateStr)
                .lte('order_date', endDateStr);
        } else if (timeFilter === '7days') {
            const d = new Date();
            d.setDate(now.getDate() - 7);
            startDateStr = getLocalDateString(d);
            query = query.gte('order_date', startDateStr);
        } else if (timeFilter === 'month') {
            const d = new Date();
            d.setMonth(now.getMonth() - 1);
            startDateStr = getLocalDateString(d);
            query = query.gte('order_date', startDateStr);
        } else if (timeFilter === 'year') {
            const d = new Date();
            d.setFullYear(now.getFullYear() - 1);
            startDateStr = getLocalDateString(d);
            query = query.gte('order_date', startDateStr);
        }

        if (selectedCustomerId !== 'all') {
            query = query.eq('customer_id', selectedCustomerId);
        }

        const { data: orders } = await query;
        const { data: cData } = await supabase.from('customers').select('id, name');
        setCustomers(cData || []);

        if (orders) {
            // Process Bar Chart (Revenue by Date)
            const dateMap = {};
            orders.forEach(o => {
                const d = new Date(o.order_date).toLocaleDateString('vi-VN');
                dateMap[d] = (dateMap[d] || 0) + (o.status !== 'Đã hủy' ? Number(o.total_amount) : 0);
            });
            const barData = Object.entries(dateMap)
                .map(([name, value]) => {
                    const [day, month, year] = name.split('/');
                    return { name, value, date: new Date(year, month - 1, day) };
                })
                .sort((a, b) => a.date - b.date);

            // Process Pie Chart (Revenue by Customer - top 5)
            const custMap = {};
            orders.forEach(o => {
                if (o.status !== 'Đã hủy') {
                    const name = o.customers?.name || 'Ẩn danh';
                    const code = o.customers?.code || 'KH';
                    if (!custMap[name]) {
                        custMap[name] = { total: 0, code: code };
                    }
                    custMap[name].total += Number(o.total_amount);
                }
            });
            const pieData = Object.entries(custMap)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 5)
                .map(([name, info]) => ({
                    name,
                    shortName: info.code,
                    value: info.total
                }));

            setData({
                bar: barData,
                pie: pieData,
                orderCount: orders.filter(o => o.status !== 'Đã hủy').length
            });
        }
        setLoading(false);
    };

    const COLORS = ['#FF8C00', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(val);

    return (
        <div className="tab-content glass-panel" style={{ padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
                <h2>TỔNG QUAN KINH DOANH</h2>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ width: 'auto', minWidth: '150px' }}>
                        <option value="day">Hôm nay</option>
                        <option value="7days">7 Ngày qua</option>
                        <option value="month">Tháng này</option>
                        <option value="year">Năm này</option>
                    </select>
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} style={{ width: 'auto', minWidth: '200px' }}>
                        <option value="all">Tất cả khách hàng</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <p>Đang tải dữ liệu...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '20px' }}>
                    <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)', padding: '25px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ marginBottom: '25px', textAlign: 'center', color: 'var(--primary-orange-light)', letterSpacing: '1px' }}>DOANH THU THEO THỜI GIAN</h4>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.bar}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                    <YAxis tickFormatter={formatCurrency} stroke="var(--text-muted)" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1c22', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'white' }}
                                        labelStyle={{ color: 'var(--primary-orange-light)' }}
                                        formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                                    />
                                    <Legend />
                                    <Bar
                                        dataKey="value"
                                        name="Doanh thu (VNĐ)"
                                        radius={[6, 6, 0, 0]}
                                        barSize={30}
                                        label={{ position: 'top', fill: 'white', formatter: (val) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(val), fontSize: 10 }}
                                    >
                                        {data.bar.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)', padding: '25px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ marginBottom: '25px', textAlign: 'center', color: 'var(--primary-orange-light)', letterSpacing: '1px' }}>TỶ TRỌNG DOANH THU KHÁCH HÀNG (TOP 5)</h4>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.pie}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({ name, percent, shortName }) => `${shortName} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={true}
                                    >
                                        {data.pie.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#1a1c22', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'white' }}
                                        formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
                            {data.pie.map((entry, index) => (
                                <div key={index} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '12px', height: '12px', background: COLORS[index % COLORS.length], borderRadius: '3px' }}></div>
                                    <span style={{ color: 'white' }}>{entry.shortName}: {entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{ marginTop: '30px', background: 'linear-gradient(135deg, var(--primary-orange) 0%, #FFB347 100%)', padding: '30px', color: 'white', display: 'flex', justifyContent: 'space-around', textAlign: 'center', boxShadow: '0 10px 30px rgba(255, 140, 0, 0.3)' }}>
                <div>
                    <p style={{ fontSize: '14px', opacity: 0.9, letterSpacing: '1px' }}>TỔNG DOANH THU ƯỚC TÍNH</p>
                    <h2 style={{ fontSize: '32px', fontWeight: '900' }}>{new Intl.NumberFormat('vi-VN').format(data.bar.reduce((sum, item) => sum + item.value, 0))} VNĐ</h2>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '50px' }}>
                    <p style={{ fontSize: '14px', opacity: 0.9, letterSpacing: '1px' }}>SỐ LƯỢNG ĐƠN HÀNG</p>
                    <h2 style={{ fontSize: '32px', fontWeight: '900' }}>{data.orderCount} ĐƠN</h2>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
