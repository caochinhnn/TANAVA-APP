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
            const barData = Object.entries(dateMap).map(([name, value]) => ({ name, value }));

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
        <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <h2>TỔNG QUAN KINH DOANH</h2>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                        <option value="day">Hôm nay</option>
                        <option value="7days">7 Ngày qua</option>
                        <option value="month">Tháng này</option>
                        <option value="year">Năm này</option>
                    </select>
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                        <option value="all">Tất cả khách hàng</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name.substring(0, 15)}...</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <p>Đang tải dữ liệu...</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '20px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <h4 style={{ marginBottom: '20px', textAlign: 'center' }}>DOANH THU THEO THỜI GIAN</h4>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.bar}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={formatCurrency} />
                                    <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)} />
                                    <Legend />
                                    <Bar
                                        dataKey="value"
                                        name="Doanh thu (VNĐ)"
                                        radius={[4, 4, 0, 0]}
                                        barSize={30}
                                        label={{ position: 'top', formatter: (val) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(val), fontSize: 10 }}
                                    >
                                        {data.bar.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <h4 style={{ marginBottom: '20px', textAlign: 'center' }}>TỶ TRỌNG DOANH THU KHÁCH HÀNG (TOP 5)</h4>
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
                                        label={({ name, percent, shortName }) => `${shortName} ${(percent * 100).toFixed(0)}%`} // Show short name and % inside/nearby
                                        labelLine={true}
                                    >
                                        {data.pie.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                            {data.pie.map((entry, index) => (
                                <div key={index} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '12px', height: '12px', background: COLORS[index % COLORS.length] }}></div>
                                    <span>{entry.shortName}: {entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '30px', background: 'var(--primary-orange)', padding: '20px', borderRadius: '8px', color: 'white', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div>
                    <p style={{ fontSize: '14px', opacity: 0.9 }}>Tổng doanh thu ước tính</p>
                    <h2 style={{ fontSize: '28px' }}>{new Intl.NumberFormat('vi-VN').format(data.bar.reduce((sum, item) => sum + item.value, 0))} VNĐ</h2>
                </div>
                <div>
                    <p style={{ fontSize: '14px', opacity: 0.9 }}>Số lượng đơn hàng</p>
                    <h2 style={{ fontSize: '28px' }}>{data.orderCount} Đơn</h2>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
