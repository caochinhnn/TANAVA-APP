import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit, Trash2, Search, X, FileText, Download, Check } from 'lucide-react';
import Modal from './Modal';
import { generateDeliveryNote } from '../utils/generateDeliveryNote';

import { getLocalDateString } from '../utils/dateUtils';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [timeFilter, setTimeFilter] = useState('all');
    const [selectedCustomerIdFilter, setSelectedCustomerIdFilter] = useState('all');
    const [customDates, setCustomDates] = useState({
        start: getLocalDateString(),
        end: getLocalDateString()
    });

    const [formData, setFormData] = useState({
        customer_id: '',
        order_date: getLocalDateString(),
        order_code: '',
        status: 'Đang xử lý',
        delivery_phone: '',
        extra_charge: 0,
        extra_charge_notes: '',
        items: []
    });

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                setShowModal(false);
                setShowPreview(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    useEffect(() => {
        fetchData();
    }, [timeFilter, selectedCustomerIdFilter, customDates]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let startDateStr = '';
            let endDateStr = null;

            if (timeFilter === 'day') {
                startDateStr = getLocalDateString(now);
                endDateStr = startDateStr;
            } else if (timeFilter === '7days') {
                const d = new Date();
                d.setDate(now.getDate() - 7);
                startDateStr = getLocalDateString(d);
            } else if (timeFilter === 'month') {
                const d = new Date();
                d.setDate(1);
                startDateStr = getLocalDateString(d);
            } else if (timeFilter === 'custom') {
                startDateStr = customDates.start;
                endDateStr = customDates.end;
            }

            let query = supabase
                .from('orders')
                .select('*, customers(name, code, address, delivery_location, receiver, phone), delivery_phone')
                .order('order_date', { ascending: false });

            if (startDateStr) {
                query = query.gte('order_date', startDateStr);
            }
            if (endDateStr) {
                query = query.lte('order_date', endDateStr);
            }
            if (selectedCustomerIdFilter !== 'all') {
                query = query.eq('customer_id', selectedCustomerIdFilter);
            }

            const { data: oData, error: oError } = await query;
            if (oError) throw oError;

            const { data: cData, error: cError } = await supabase.from('customers').select('*').order('name', { ascending: true });
            if (cError) throw cError;

            const { data: pData, error: pError } = await supabase.from('products').select('*').order('name', { ascending: true });
            if (pError) throw pError;

            setOrders(oData || []);
            setCustomers(cData || []);
            setProducts(pData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert(`Lỗi khi tải dữ liệu: ${error.message}`);
        }
        setLoading(false);
    };

    const generateOrderCode = async (customerId, dateStr) => {
        if (!customerId || !dateStr) return '';
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return '';

        const date = new Date(dateStr);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yy = String(date.getFullYear()).slice(-2);
        const datePrefix = `${dd}${mm}${yy}`;

        // Count orders for this customer on this day
        const { data } = await supabase
            .from('orders')
            .select('order_code')
            .eq('customer_id', customerId)
            .eq('order_date', dateStr);

        const count = (data?.length || 0) + 1;
        const zz = String(count).padStart(2, '0');

        return `${datePrefix}${customer.code}${zz}`;
    };

    const handleCustomerChange = async (e) => {
        const cid = e.target.value;
        const customer = customers.find(c => c.id === cid);
        const code = await generateOrderCode(cid, formData.order_date);
        setFormData({
            ...formData,
            customer_id: cid,
            order_code: code,
            delivery_phone: customer ? (customer.phone || '') : ''
        });
    };

    const handleDateChange = async (e) => {
        const date = e.target.value;
        const code = await generateOrderCode(formData.customer_id, date);
        setFormData({ ...formData, order_date: date, order_code: code });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { product_id: '', quantity_requested: null, quantity_actual: null, unit_price: 0, total_price: 0 }]
        });
    };

    const removeItem = (index) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = async (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        if (field === 'product_id' && value) {
            const { data: priceData } = await supabase
                .from('customer_product_prices')
                .select('price')
                .eq('customer_id', formData.customer_id)
                .eq('product_id', value)
                .single();

            const product = products.find(p => p.id === value);
            newItems[index].unit_price = priceData?.price || product?.default_price || 0;
        }

        if (field === 'quantity_actual' || field === 'unit_price' || field === 'product_id') {
            const qty = newItems[index].quantity_actual;
            const price = newItems[index].unit_price;
            if (qty === null || qty === undefined || qty === '' || !price) {
                newItems[index].total_price = 0;
            } else {
                // Round to avoid floating point tails
                newItems[index].total_price = Math.round(Number(qty) * Number(price));
            }
        }

        setFormData({ ...formData, items: newItems });
    };

    const handleKeyDown = (e, rowIndex, colIndex) => {
        const inputs = document.querySelectorAll('.order-item-input');
        const numCols = 3; // requested_qty, actual_qty, unit_price (STT and product are usually not arrows-navigable or select)

        switch (e.key) {
            case 'ArrowRight':
                if (colIndex < numCols - 1) {
                    inputs[rowIndex * numCols + colIndex + 1]?.focus();
                    e.preventDefault();
                }
                break;
            case 'ArrowLeft':
                if (colIndex > 0) {
                    inputs[rowIndex * numCols + colIndex - 1]?.focus();
                    e.preventDefault();
                }
                break;
            case 'ArrowDown':
                inputs[(rowIndex + 1) * numCols + colIndex]?.focus();
                e.preventDefault();
                break;
            case 'ArrowUp':
                if (rowIndex > 0) {
                    inputs[(rowIndex - 1) * numCols + colIndex]?.focus();
                    e.preventDefault();
                }
                break;
            case 'Enter':
                if (rowIndex === formData.items.length - 1 && colIndex === numCols - 1) {
                    addItem();
                } else {
                    inputs[rowIndex * numCols + colIndex + 1]?.focus();
                }
                e.preventDefault();
                break;
            default:
                break;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customer_id) {
            alert('Vui lòng chọn khách hàng!');
            return;
        }

        const totalAmount = formData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
        let orderId = editingOrder?.id;

        try {
            if (editingOrder) {
                const { error } = await supabase.from('orders').update({
                    customer_id: formData.customer_id,
                    order_date: formData.order_date,
                    order_code: formData.order_code,
                    status: formData.status,
                    delivery_phone: formData.delivery_phone,
                    total_amount: totalAmount,
                    extra_charge: Number(formData.extra_charge) || 0,
                    extra_charge_notes: formData.extra_charge_notes
                }).eq('id', orderId);

                if (error) throw error;
                await supabase.from('order_items').delete().eq('order_id', orderId);
            } else {
                const { data, error } = await supabase.from('orders').insert([{
                    customer_id: formData.customer_id,
                    order_date: formData.order_date,
                    order_code: formData.order_code,
                    status: formData.status,
                    delivery_phone: formData.delivery_phone,
                    total_amount: totalAmount,
                    extra_charge: Number(formData.extra_charge) || 0,
                    extra_charge_notes: formData.extra_charge_notes
                }]).select();

                if (error) throw error;
                orderId = data[0].id;
            }

            const itemsToInsert = formData.items.map(item => ({
                order_id: orderId,
                product_id: item.product_id,
                quantity_requested: item.quantity_requested,
                quantity_actual: item.quantity_actual,
                unit_price: item.unit_price,
                total_price: item.total_price
            }));

            const { error: itemError } = await supabase.from('order_items').insert(itemsToInsert);
            if (itemError) throw itemError;

            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving order:', error);
            alert(`Lỗi khi lưu đơn hàng: ${error.message}`);
        }
    };

    const openEditModal = async (order) => {
        setEditingOrder(order);
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
        setFormData({
            customer_id: order.customer_id,
            order_date: order.order_date,
            order_code: order.order_code,
            status: order.status,
            delivery_phone: order.delivery_phone || '',
            extra_charge: order.extra_charge || 0,
            extra_charge_notes: order.extra_charge_notes || '',
            items: items || []
        });
        setShowModal(true);
    };

    const openPreview = async (order) => {
        setSelectedOrder(order);
        const { data: items } = await supabase.from('order_items').select('*, products(name, unit)').eq('order_id', order.id);
        setSelectedOrder({ ...order, items: items || [] });
        setShowPreview(true);
    };

    const exportPDF = async () => {
        try {
            await generateDeliveryNote(selectedOrder);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Lỗi khi xuất PDF. Vui lòng kiểm tra kết nối mạng để tải font.');
        }
    };

    const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
};

// Helper for input formatting
const formatInputCurrency = (value) => {
    if (!value) return '';
    const numericValue = value.replace(/\D/g, '');
    return new Intl.NumberFormat('vi-VN').format(numericValue);
};

const parseInputCurrency = (value) => {
    if (!value) return 0;
    return parseInt(value.replace(/\D/g, '')) || 0;
};

    const handleDelete = async (id) => {
        if (window.confirm('Xóa đơn hàng này?')) {
            await supabase.from('orders').delete().eq('id', id);
            fetchData();
        }
    };

    return (
        <>
            <div className="tab-content glass-panel" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                    <h2>QUẢN LÝ ĐƠN HÀNG</h2>
                    <button className="btn btn-primary" onClick={() => { setEditingOrder(null); setFormData({ customer_id: '', order_date: getLocalDateString(), order_code: '', status: 'Đang xử lý', delivery_phone: '', extra_charge: 0, extra_charge_notes: '', items: [] }); setShowModal(true); }}>
                        <Plus size={20} /> Tạo Đơn Mới
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', padding: '15px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Thời Gian</label>
                        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={{ minWidth: '150px' }}>
                            <option value="all">Tất cả thời gian</option>
                            <option value="day">Hôm nay</option>
                            <option value="7days">7 Ngày qua</option>
                            <option value="month">Tháng này</option>
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
                        <select value={selectedCustomerIdFilter} onChange={(e) => setSelectedCustomerIdFilter(e.target.value)}>
                            <option value="all">Tất cả khách hàng</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Mã Đơn</th>
                            <th>Khách Hàng</th>
                            <th>Ngày</th>
                            <th>Trạng Thái</th>
                            <th>Tổng Tiền</th>
                            <th>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td style={{ fontWeight: 'bold' }}>{order.order_code}</td>
                                <td style={{ textAlign: 'left' }}>{order.customers?.name}</td>
                                <td>{new Date(order.order_date).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: order.status === 'Đã thanh toán' ? 'rgba(40, 167, 69, 0.2)' : order.status === 'Đang xử lý' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(220, 53, 69, 0.2)',
                                        color: order.status === 'Đã thanh toán' ? '#75ff91' : order.status === 'Đang xử lý' ? '#ffe082' : '#ff8a8a',
                                        border: `1px solid ${order.status === 'Đã thanh toán' ? 'rgba(40, 167, 69, 0.3)' : order.status === 'Đang xử lý' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(220, 53, 69, 0.3)'}`
                                    }}>
                                        {order.status}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 'bold' }}>{formatCurrency(order.total_amount)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                        <button title="Xem phiếu" onClick={() => openPreview(order)} style={{ color: '#ff8c00', background: 'none', border: 'none', cursor: 'pointer' }}><FileText size={18} /></button>
                                        <button onClick={() => openEditModal(order)} style={{ color: '#007bff', background: 'none', border: 'none', cursor: 'pointer' }}><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(order.id)} style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} maxWidth="900px">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3>{editingOrder ? 'CHỈNH SỬA ĐƠN HÀNG' : 'TẠO ĐƠN HÀNG MỚI'}</h3>
                    <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Khách hàng</label>
                            <select value={formData.customer_id} onChange={handleCustomerChange} required>
                                <option value="">-- Chọn khách hàng --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Ngày giao hàng</label>
                            <input type="date" value={formData.order_date} onChange={handleDateChange} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Mã đơn hàng</label>
                            <input type="text" value={formData.order_code} readOnly style={{ opacity: 0.7 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>SĐT Giao hàng</label>
                            <input type="text" value={formData.delivery_phone} onChange={(e) => setFormData({ ...formData, delivery_phone: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Trạng thái</label>
                            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                <option value="Đang xử lý">Đang xử lý</option>
                                <option value="Đã giao">Đã giao</option>
                                <option value="Đã thanh toán">Đã thanh toán</option>
                                <option value="Đã hủy">Đã hủy</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                            <h4 style={{ margin: 0 }}>CHI TIẾT MẶT HÀNG</h4>
                            <button type="button" className="btn btn-primary" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Plus size={16} /> Thêm SP
                            </button>
                        </div>
                        <table style={{ boxShadow: 'none' }}>
                            <thead>
                                <tr>
                                     <th style={{ textAlign: 'left', width: '32%' }}>Sản Phẩm</th>
                                     <th style={{ width: '15%' }}>SL Yêu cầu</th>
                                     <th style={{ width: '15%' }}>SL Thực tế</th>
                                     <th style={{ width: '18%' }}>Đơn Giá</th>
                                     <th style={{ width: '20%' }}>Thành Tiền</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ width: '32%' }}>
                                            <select value={item.product_id} onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)} required style={{ width: '100%', border: 'none', background: 'transparent' }}>
                                                <option value="">-- Chọn SP --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                                            </select>
                                        </td>
                                        <td style={{ width: '15%' }}>
                                            <input
                                                type="number"
                                                className="order-item-input highlight-input"
                                                value={item.quantity_requested || ''}
                                                onChange={(e) => handleItemChange(idx, 'quantity_requested', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, idx, 0)}
                                                style={{ width: '100%', textAlign: 'center', padding: '14px 10px' }}
                                            />
                                        </td>
                                        <td style={{ width: '15%' }}>
                                            <input
                                                type="number"
                                                className="order-item-input highlight-input"
                                                value={item.quantity_actual || ''}
                                                onChange={(e) => handleItemChange(idx, 'quantity_actual', e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, idx, 1)}
                                                style={{ width: '100%', textAlign: 'center', padding: '14px 10px' }}
                                            />
                                        </td>
                                        <td style={{ width: '18%' }}>
                                            <input
                                                type="text"
                                                className="order-item-input highlight-input"
                                                value={formatInputCurrency(String(item.unit_price))}
                                                onChange={(e) => handleItemChange(idx, 'unit_price', parseInputCurrency(e.target.value))}
                                                onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                                                style={{ width: '100%', textAlign: 'center' }}
                                            />
                                        </td>
                                        <td style={{ fontWeight: 'bold', width: '20%' }}>{item.quantity_actual ? formatCurrency(item.total_price) : ''}</td>
                                        <td style={{ width: '50px' }}><button type="button" onClick={() => removeItem(idx)} style={{ color: '#dc3545', border: 'none', background: 'none' }}><Trash2 size={16} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '15px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phí bổ sung (Ship/Phí khác)</label>
                                <input
                                    type="number"
                                    value={formData.extra_charge}
                                    onChange={(e) => setFormData({ ...formData, extra_charge: e.target.value })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ghi chú phí</label>
                                <input
                                    type="text"
                                    value={formData.extra_charge_notes}
                                    onChange={(e) => setFormData({ ...formData, extra_charge_notes: e.target.value })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                            <div style={{ fontSize: '16px' }}>Tiền hàng: <span style={{ fontWeight: 'bold' }}>{formatCurrency(formData.items.reduce((sum, item) => sum + (item.total_price || 0), 0))}</span></div>
                            <div style={{ fontSize: '16px' }}>Phí bổ sung: <span style={{ fontWeight: 'bold' }}>{formatCurrency(Number(formData.extra_charge) || 0)}</span></div>
                            <div style={{ fontSize: '20px', color: 'var(--primary-orange)', marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                                Tổng cộng đơn hàng: <span style={{ fontWeight: '900', color: 'white' }}>{formatCurrency(formData.items.reduce((sum, item) => sum + (item.total_price || 0), 0) + (Number(formData.extra_charge) || 0))}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn" style={{ border: '1px solid #ccc' }} onClick={() => setShowModal(false)}>Hủy</button>
                        <button type="submit" className="btn btn-primary">Lưu Đơn Hàng</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} maxWidth="800px">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 10 }}>
                    <h3>XEM TRƯỚC PHIẾU GIAO HÀNG</h3>
                    <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <div id="delivery-note-preview" style={{ border: '1px solid #ccc', padding: '40px', background: 'white', color: 'black', fontFamily: 'Arial, sans-serif', lineHeight: '1.4' }}>
                    {/* Header Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ textAlign: 'left', fontSize: '12px' }}>
                            <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>CÔNG TY TNHH TM DV THỰC PHẨM TÂN NAM VANG</h4>
                            <p style={{ margin: '2px 0' }}>Địa chỉ: 25 Nguyễn Duy, Phường 9, Quận 8, Tp Hồ Chí Minh</p>
                            <p style={{ margin: '2px 0' }}>Xưởng: E15/239E, QL50, Ấp 5, Xã Phong Phú, Bình Chánh, Tp HCM</p>
                            <p style={{ margin: '2px 0' }}>MST: 0317426213   SĐT: 096 555 1315</p>
                            <p style={{ margin: '2px 0' }}>Mail: Tanavafoods@gmail.com</p>
                            <p style={{ margin: '2px 0' }}>STK: 1030528656 - Vietcombank CN Nam Sài Gòn</p>
                        </div>
                        <div style={{ display: 'flex', height: '250px', alignItems: 'flex-start', marginTop: '-100px', marginRight: '-40px' }}>
                            <img src="/logo.png" alt="Logo" style={{ height: '250px', objectFit: 'contain' }} />
                        </div>
                    </div>

                    {/* Title Section */}
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <h1 style={{ margin: '0', fontSize: '32px', fontWeight: 'bold' }}>PHIẾU GIAO HÀNG</h1>
                        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>
                            Số phiếu: {selectedOrder?.order_code}
                        </div>
                    </div>

                    {/* Info Section - Plain text layout */}
                    <div style={{ textAlign: 'left', marginBottom: '20px', fontSize: '14px' }}>
                        <p style={{ margin: '3px 0' }}><strong>Khách hàng:</strong> {selectedOrder?.customers?.name}</p>
                        <p style={{ margin: '3px 0' }}><strong>Địa chỉ Cty:</strong> {selectedOrder?.customers?.address}</p>
                        <p style={{ margin: '3px 0' }}><strong>Địa chỉ nhận hàng:</strong> {selectedOrder?.customers?.delivery_location || selectedOrder?.customers?.address || 'Như trên'}</p>
                        <p style={{ margin: '3px 0' }}><strong>Người nhận:</strong> {selectedOrder?.customers?.receiver}</p>
                        <p style={{ margin: '3px 0' }}><strong>Liên hệ:</strong> <span style={{ fontWeight: 'bold' }}>{selectedOrder?.delivery_phone || selectedOrder?.customers?.phone}</span></p>
                        <p style={{ margin: '3px 0' }}><strong>Thanh toán:</strong> CK</p>
                    </div>

                    <p style={{ textAlign: 'left', marginBottom: '10px' }}>Chúng tôi xin giao các sản phẩm như sau:</p>

                    <table style={{ textAlign: 'center', borderCollapse: 'collapse', width: '100%', marginBottom: '10px', fontSize: '13px', color: 'black' }}>
                        <thead style={{ background: '#fff' }}>
                            <tr>
                                <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', color: 'black' }}>STT</th>
                                <th style={{ textAlign: 'center', border: '1px solid black', padding: '10px', fontWeight: 'bold', color: 'black' }}>TÊN HÀNG</th>
                                <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', color: 'black' }}>ĐVT</th>
                                <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', color: 'black', textAlign: 'center' }}>SL Yêu cầu</th>
                                <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', color: 'black', textAlign: 'center' }}>SL Thực tế</th>
                                <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', color: 'black' }}>ĐƠN GIÁ</th>
                                <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold', color: 'black' }}>THÀNH TIỀN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedOrder?.items?.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ border: '1px solid black', padding: '10px', color: 'black' }}>{idx + 1}</td>
                                    <td style={{ textAlign: 'left', border: '1px solid black', padding: '10px', color: 'black' }}>{item.products?.name}</td>
                                    <td style={{ border: '1px solid black', padding: '10px', color: 'black' }}>{item.products?.unit}</td>
                                    <td style={{ border: '1px solid black', padding: '10px', color: 'black', textAlign: 'center' }}>{item.quantity_requested || ''}</td>
                                    <td style={{ border: '1px solid black', padding: '10px', color: 'black', textAlign: 'center' }}>{item.quantity_actual || ''}</td>
                                    <td style={{ textAlign: 'center', border: '1px solid black', padding: '10px', color: 'black' }}>{formatCurrency(item.unit_price)}</td>
                                    <td style={{ textAlign: 'center', border: '1px solid black', padding: '10px', color: 'black' }}>{item.quantity_actual ? formatCurrency(item.total_price) : ''}</td>
                                </tr>
                            ))}
                            {/* Subtotal Label */}
                            {selectedOrder?.items?.some(i => i.quantity_actual) && (
                                <tr>
                                    <td colSpan="5" style={{ border: 'none' }}></td>
                                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold', color: 'black' }}>Tiền hàng</td>
                                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold', textAlign: 'right', color: 'black' }}>
                                        {formatCurrency(selectedOrder.items.reduce((sum, i) => sum + (i.quantity_actual ? i.total_price : 0), 0))}
                                    </td>
                                </tr>
                            )}
                            {/* Extra Charge Label (Conditional) */}
                            {Number(selectedOrder?.extra_charge) > 0 && (
                                <tr>
                                    <td colSpan="5" style={{ border: 'none' }}></td>
                                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold', color: 'black' }}>{selectedOrder.extra_charge_notes || 'Phí bổ sung'}</td>
                                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold', textAlign: 'right', color: 'black' }}>
                                        {formatCurrency(selectedOrder.extra_charge)}
                                    </td>
                                </tr>
                            )}
                            {/* Total Label */}
                            {selectedOrder?.items?.some(i => i.quantity_actual) && (
                                <tr>
                                    <td colSpan="5" style={{ border: 'none' }}></td>
                                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold', backgroundColor: '#f9f9f9', color: 'black' }}>Tổng cộng</td>
                                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold', textAlign: 'right', backgroundColor: '#f9f9f9', color: 'black' }}>
                                        {formatCurrency(selectedOrder.items.reduce((sum, i) => sum + (i.quantity_actual ? i.total_price : 0), 0) + (Number(selectedOrder.extra_charge) || 0))}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                        <p style={{ fontWeight: 'bold' }}>Ngày {selectedOrder && new Date(selectedOrder.order_date).getDate()} tháng {selectedOrder && new Date(selectedOrder.order_date).getMonth() + 1} năm {selectedOrder && new Date(selectedOrder.order_date).getFullYear()}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', padding: '0 50px' }}>
                        <p style={{ width: '150px', textAlign: 'center' }}>Người Nhận Hàng</p>
                        <p style={{ width: '150px', textAlign: 'center' }}>Người Giao Hàng</p>
                    </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={20} /> Xuất PDF & In
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default Orders;
