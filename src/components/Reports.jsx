import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Download, FileSpreadsheet, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

import { getLocalDateString } from '../utils/dateUtils';

const Reports = () => {
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [backupLoading, setBackupLoading] = useState(false);
    const [timeFilter, setTimeFilter] = useState('month');
    const [selectedCustomerId, setSelectedCustomerId] = useState('all');
    const [customDates, setCustomDates] = useState({
        start: getLocalDateString(),
        end: getLocalDateString()
    });

    const handleFullBackup = async () => {
        setBackupLoading(true);
        try {
            // Fetch all data from all relevant tables
            const [
                { data: customersAll },
                { data: productsAll },
                { data: ordersAll },
                { data: itemsAll },
                { data: pricesAll }
            ] = await Promise.all([
                supabase.from('customers').select('*').order('name'),
                supabase.from('products').select('*').order('name'),
                supabase.from('orders').select('*').order('order_date', { ascending: false }),
                supabase.from('order_items').select('*'),
                supabase.from('customer_product_prices').select('*')
            ]);

            // Create Workbook
            const wb = XLSX.utils.book_new();

            // Format Data for Readability
            const customersSheet = (customersAll || []).map(c => ({
                'ID Hệ Thống': c.id,
                'Tên Khách Hàng': c.name,
                'Số Điện Thoại': c.phone,
                'Địa Chỉ': c.address,
                'Ghi Chú': c.notes,
                'Ngày Tạo': c.created_at
            }));

            const productsSheet = (productsAll || []).map(p => ({
                'ID Hệ Thống': p.id,
                'Tên Sản Phẩm': p.name,
                'Đơn Vị Tính': p.unit,
                'Đơn Giá Mặc Định': p.default_price,
                'Ngày Tạo': p.created_at
            }));

            const ordersSheet = (ordersAll || []).map(o => {
                const customer = (customersAll || []).find(c => c.id === o.customer_id);
                return {
                    'ID Hệ Thống': o.id,
                    'Mã Đơn Hàng': o.order_code,
                    'Ngày Giao Hàng': o.order_date,
                    'Tên Khách Hàng': customer ? customer.name : 'N/A',
                    'Tổng Tiền': o.total_amount,
                    'Trạng Thái': o.status,
                    'Ghi Chú': o.notes,
                    'Ngày Tạo': o.created_at
                };
            });

            const itemsSheet = (itemsAll || []).map(item => {
                const order = (ordersAll || []).find(o => o.id === item.order_id);
                const product = (productsAll || []).find(p => p.id === item.product_id);
                return {
                    'ID Hệ Thống': item.id,
                    'Mã Đơn Hàng': order ? order.order_code : 'N/A',
                    'Tên Sản Phẩm': product ? product.name : 'N/A',
                    'ĐVT': product ? product.unit : 'N/A',
                    'Số Lượng Yêu Cầu': item.quantity_requested,
                    'Số Lượng Thực Tế': item.quantity_actual,
                    'Đơn Giá': item.unit_price,
                    'Thành Tiền': item.total_price,
                    'Ngày Tạo': item.created_at
                };
            });

            const pricesSheet = (pricesAll || []).map(price => {
                const customer = (customersAll || []).find(c => c.id === price.customer_id);
                const product = (productsAll || []).find(p => p.id === price.product_id);
                return {
                    'Tên Khách Hàng': customer ? customer.name : 'N/A',
                    'Tên Sản Phẩm': product ? product.name : 'N/A',
                    'Giá Riêng': price.price,
                    'Ngày Cập Nhật': price.created_at
                };
            });

            // Add Sheets
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customersSheet), "DanhSachKhachHang");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productsSheet), "DanhSachSanPham");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersSheet), "ToanBoDonHang");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsSheet), "ChiTietDonHang");
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pricesSheet), "BangGiaKhachHang");

            // Export
            const fileName = `TANAVA_BACKUP_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            alert('Đã sao lưu toàn bộ dữ liệu thành công!');
        } catch (error) {
            console.error('Backup error:', error);
            alert('Có lỗi khi sao lưu dữ liệu!');
        } finally {
            setBackupLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [timeFilter, selectedCustomerId, customDates]);

    const fetchOrders = async () => {
        setLoading(true);

        const now = new Date();
        let startDateStr = '';
        let endDateStr = null;

        if (timeFilter === 'day') {
            startDateStr = getLocalDateString(now);
            endDateStr = startDateStr; // Only today
        } else if (timeFilter === '7days') {
            const d = new Date();
            d.setDate(now.getDate() - 7);
            startDateStr = getLocalDateString(d);
            endDateStr = null; // Include future orders
        } else if (timeFilter === 'month') {
            const d = new Date();
            d.setDate(1); // 1st of this month
            startDateStr = getLocalDateString(d);
            endDateStr = null; // Include future orders
        } else if (timeFilter === 'year') {
            const d = new Date();
            d.setMonth(0, 1); // 1st of January
            startDateStr = getLocalDateString(d);
            endDateStr = null; // Include future orders
        } else if (timeFilter === 'custom') {
            startDateStr = customDates.start;
            endDateStr = customDates.end;
        }

        let query = supabase
            .from('orders')
            .select('*, customers(name), items:order_items(quantity_actual, unit_price, total_price, products(name, unit))')
            .gte('order_date', startDateStr)
            .neq('status', 'Đã hủy');

        if (endDateStr) {
            query = query.lte('order_date', endDateStr);
        }

        if (selectedCustomerId !== 'all') {
            query = query.eq('customer_id', selectedCustomerId);
        }

        try {
            const { data: oData, error: oError } = await query;
            if (oError) throw oError;

            const { data: cData, error: cError } = await supabase.from('customers').select('id, name');
            if (cError) throw cError;

            setOrders(oData || []);
            setCustomers(cData || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            alert(`Lỗi khi tải báo cáo: ${error.message}`);
        }
        setLoading(false);
    };

    // Process data for Table 1: Detailed daily list
    const detailedData = [];
    orders.forEach(order => {
        order.items.forEach(item => {
            detailedData.push({
                date: order.order_date,
                seq: order.order_code.slice(-2), // Capture sequence for sorting
                product: item.products?.name,
                unit: item.products?.unit,
                qty: item.quantity_actual,
                price: item.unit_price,
                total: item.total_price
            });
        });
    });

    // Sort detailedData by Date then by Order Sequence (from order code)
    detailedData.sort((a, b) => {
        if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
        // Assuming sequence is the last 2 characters of order_code
        return a.seq.localeCompare(b.seq);
    });

    // Process data for Table 2: Aggregated by product (like an invoice)
    const aggregatedDataMap = {};
    detailedData.forEach(item => {
        const key = item.product + item.unit + item.price;
        if (!aggregatedDataMap[key]) {
            aggregatedDataMap[key] = { ...item };
        } else {
            aggregatedDataMap[key].qty += item.qty;
            aggregatedDataMap[key].total += item.total;
        }
    });
    const aggregatedData = Object.values(aggregatedDataMap);

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val);

    const exportExcel = () => {
        const wb = XLSX.utils.book_new();

        // Detailed Sheet
        const ws1Data = detailedData.map((d, i) => ({
            'STT': i + 1,
            'Ngày giao': d.date,
            'Tên sản phẩm': d.product,
            'ĐVT': d.unit,
            'Số lượng': d.qty,
            'Đơn giá': d.price,
            'Thành tiền': d.total
        }));
        const ws1 = XLSX.utils.json_to_sheet(ws1Data);
        XLSX.utils.book_append_sheet(wb, ws1, "Báo cáo chi tiết");

        // Aggregated Sheet
        const ws2Data = aggregatedData.map((d, i) => ({
            'STT': i + 1,
            'Tên sản phẩm': d.product,
            'ĐVT': d.unit,
            'Tổng Số lượng': d.qty,
            'Đơn giá': d.price,
            'Tổng Thành tiền': d.total
        }));
        const ws2 = XLSX.utils.json_to_sheet(ws2Data);
        XLSX.utils.book_append_sheet(wb, ws2, "Tổng hợp xuất hóa đơn");

        XLSX.writeFile(wb, `BaoCaoDoanhThu_${timeFilter}.xlsx`);
    };

    return (
        <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <h2>BÁO CÁO DOANH THU</h2>
                <button className="btn btn-primary" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileSpreadsheet size={20} /> Xuất Excel
                </button>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Thời Gian</label>
                    <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                        <option value="day">Hôm nay</option>
                        <option value="7days">7 Ngày qua</option>
                        <option value="month">Tháng này</option>
                        <option value="year">Năm này</option>
                        <option value="custom">Tùy chỉnh</option>
                    </select>
                </div>

                {timeFilter === 'custom' && (
                    <>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Từ ngày</label>
                            <input
                                type="date"
                                value={customDates.start}
                                onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Đến ngày</label>
                            <input
                                type="date"
                                value={customDates.end}
                                onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                            />
                        </div>
                    </>
                )}

                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                    <label>Khách Hàng</label>
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                        <option value="all">Tất cả khách hàng</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--primary-orange)' }}>1. CHI TIẾT GIAO HÀNG</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Ngày giao</th>
                            <th>Tên sản phẩm</th>
                            <th>ĐVT</th>
                            <th>Số lượng thực nhận</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detailedData.map((d, i) => (
                            <tr key={i}>
                                <td>{new Date(d.date).toLocaleDateString('vi-VN')}</td>
                                <td style={{ textAlign: 'left' }}>{d.product}</td>
                                <td>{d.unit}</td>
                                <td>{d.qty}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(d.price)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(d.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#fff5e6', fontWeight: 'bold' }}>
                            <td colSpan="5">TỔNG CỘNG</td>
                            <td style={{ textAlign: 'right', color: 'var(--primary-orange)', fontSize: '18px' }}>
                                {formatCurrency(detailedData.reduce((sum, d) => sum + d.total, 0))}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div>
                <h3 style={{ marginBottom: '15px', color: 'var(--primary-orange)' }}>2. TỔNG HỢP SẢN PHẨM (XUẤT HÓA ĐƠN)</h3>
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên sản phẩm</th>
                            <th>ĐVT</th>
                            <th>Số lượng thực nhận</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aggregatedData.map((d, i) => (
                            <tr key={i}>
                                <td>{i + 1}</td>
                                <td style={{ textAlign: 'left' }}>{d.product}</td>
                                <td>{d.unit}</td>
                                <td>{d.qty}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(d.price)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(d.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#fff5e6', fontWeight: 'bold' }}>
                            <td colSpan="5">TỔNG CỘNG</td>
                            <td style={{ textAlign: 'right', color: 'var(--primary-orange)', fontSize: '18px' }}>
                                {formatCurrency(aggregatedData.reduce((sum, d) => sum + d.total, 0))}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            {/* Data Backup Section */}
            <div style={{
                marginTop: '40px',
                padding: '30px',
                background: '#F8F9FA',
                borderRadius: '15px',
                border: '1px solid #E9ECEF',
                textAlign: 'center'
            }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', background: '#E3F2FD', borderRadius: '12px', marginBottom: '15px' }}>
                    <Database color="#1976D2" size={24} />
                </div>
                <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>Hệ Thống Sao Lưu Dự Phòng</h3>
                <p style={{ color: '#666', fontSize: '14px', maxWidth: '500px', margin: '0 auto 20px' }}>
                    Tải về toàn bộ dữ liệu (Khách hàng, Sản phẩm, Bảng giá, Đơn hàng) dưới dạng file Excel để lưu trữ an toàn trên máy tính cá nhân hoặc Google Drive.
                </p>
                <button
                    onClick={handleFullBackup}
                    disabled={backupLoading}
                    className="btn btn-primary"
                    style={{
                        background: '#1976D2',
                        borderColor: '#1976D2',
                        padding: '12px 25px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        margin: '0 auto'
                    }}
                >
                    <Download size={18} /> {backupLoading ? 'Đang xử lý...' : 'SAO LƯU TOÀN BỘ DỮ LIỆU'}
                </button>
                <p style={{ marginTop: '15px', fontSize: '12px', color: '#AAA' }}>Chúng tôi khuyên bạn nên thực hiện sao lưu ít nhất 1 lần/tuần.</p>
            </div>
        </div>
    );
};

export default Reports;
