import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit, Trash2, Search, X, FileText, Download, Check } from 'lucide-react';
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

    const [formData, setFormData] = useState({
        customer_id: '',
        order_date: getLocalDateString(),
        order_code: '',
        status: 'Đang xử lý',
        delivery_phone: '',
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
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: oData, error: oError } = await supabase.from('orders').select('*, customers(name, code, address, delivery_location, receiver, phone), delivery_phone').order('created_at', { ascending: false });
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
            // Get price for this customer/product
            const { data: priceData } = await supabase
                .from('customer_product_prices')
                .select('price')
                .eq('customer_id', formData.customer_id)
                .eq('product_id', value)
                .single();

            const product = products.find(p => p.id === value);
            newItems[index].unit_price = priceData?.price || product?.default_price || 0;
        }

        if (field === 'quantity_actual' || field === 'unit_price') {
            const qty = newItems[index].quantity_actual;
            if (qty === null || qty === undefined || qty === '') {
                newItems[index].total_price = 0;
            } else {
                newItems[index].total_price = Number(qty) * Number(newItems[index].unit_price);
            }
        }

        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customer_id) {
            alert('Vui lòng chọn khách hàng!');
            return;
        }

        const totalAmount = formData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
        let orderId = editingOrder?.id;

        if (editingOrder) {
            const { error } = await supabase.from('orders').update({
                customer_id: formData.customer_id,
                order_date: formData.order_date,
                order_code: formData.order_code,
                status: formData.status,
                delivery_phone: formData.delivery_phone,
                total_amount: totalAmount
            }).eq('id', orderId);

            if (error) {
                console.error('Error updating order:', error);
                alert(`Lỗi khi cập nhật đơn hàng: ${error.message}`);
                return;
            }

            await supabase.from('order_items').delete().eq('order_id', orderId);
        } else {
            const { data, error } = await supabase.from('orders').insert([{
                customer_id: formData.customer_id,
                order_date: formData.order_date,
                order_code: formData.order_code,
                status: formData.status,
                delivery_phone: formData.delivery_phone,
                total_amount: totalAmount
            }]).select();

            if (error) {
                console.error('Error creating order:', error);
                alert(`Lỗi khi tạo đơn hàng: ${error.message}`);
                return;
            }
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
        if (itemError) {
            console.error('Error saving order items:', itemError);
            alert(`Lỗi khi lưu chi tiết đơn hàng: ${itemError.message}`);
        } else {
            setShowModal(false);
            fetchData();
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

    const formatCurrency = (value) => new Intl.NumberFormat('vi-VN').format(value);

    const handleDelete = async (id) => {
        if (window.confirm('Xóa đơn hàng này?')) {
            await supabase.from('orders').delete().eq('id', id);
            fetchData();
        }
    };

    return (
        <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <h2>QUẢN LÝ ĐƠN HÀNG</h2>
                <button className="btn btn-primary" onClick={() => { setEditingOrder(null); setFormData({ customer_id: '', order_date: getLocalDateString(), order_code: '', status: 'Đang xử lý', delivery_phone: '', items: [] }); setShowModal(true); }}>
                    <Plus size={20} /> Tạo Đơn Mới
                </button>
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
                                    padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                    backgroundColor: order.status === 'Đã thanh toán' ? '#d4edda' : order.status === 'Đang xử lý' ? '#fff3cd' : '#f8d7da',
                                    color: order.status === 'Đã thanh toán' ? '#155724' : order.status === 'Đang xử lý' ? '#856404' : '#721c24'
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

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '900px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3>{editingOrder ? 'CHỈNH SỬA ĐƠN HÀNG' : 'TẠO ĐƠN HÀNG MỚI'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div className="form-group">
                                    <label>Khách Hàng *</label>
                                    <select value={formData.customer_id} onChange={handleCustomerChange} required>
                                        <option value="">-- Chọn khách hàng --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Ngày Lập</label>
                                    <input type="date" value={formData.order_date} onChange={handleDateChange} required />
                                </div>
                                <div className="form-group">
                                    <label>Mã Đơn (Tự động)</label>
                                    <input value={formData.order_code} onChange={(e) => setFormData({ ...formData, order_code: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Số ĐT Nhận Hàng</label>
                                    <input value={formData.delivery_phone} onChange={(e) => setFormData({ ...formData, delivery_phone: e.target.value })} placeholder="Mặc định từ khách hàng" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Trạng Thái</label>
                                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                    <option value="Đang xử lý">Đang xử lý (Chưa tính công nợ)</option>
                                    <option value="Đã giao">Đã giao (Tính công nợ)</option>
                                    <option value="Đã thanh toán">Đã thanh toán (Trừ công nợ)</option>
                                    <option value="Đã hủy">Đã hủy</option>
                                </select>
                            </div>

                            <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <h4 style={{ color: 'var(--primary-orange)' }}>Danh Sách Sản Phẩm</h4>
                                    <button type="button" className="btn btn-primary" onClick={addItem}><Plus size={16} /> Thêm SP</button>
                                </div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '30%' }}>Sản Phẩm</th>
                                            <th>SL Yêu Cầu</th>
                                            <th>SL Thực Tế</th>
                                            <th>Đơn Giá</th>
                                            <th>Thành Tiền</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <select value={item.product_id} onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)} required>
                                                        <option value="">-- Chọn SP --</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                                                    </select>
                                                </td>
                                                <td><input type="number" step="0.01" value={item.quantity_requested || ''} onChange={(e) => handleItemChange(idx, 'quantity_requested', e.target.value === '' ? null : e.target.value)} placeholder="Trống" /></td>
                                                <td><input type="number" step="0.01" value={item.quantity_actual || ''} onChange={(e) => handleItemChange(idx, 'quantity_actual', e.target.value === '' ? null : e.target.value)} placeholder="Trống" /></td>
                                                <td><input type="number" value={item.unit_price} onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)} /></td>
                                                <td style={{ fontWeight: 'bold' }}>{item.quantity_actual ? formatCurrency(item.total_price) : ''}</td>
                                                <td><button type="button" onClick={() => removeItem(idx)} style={{ color: '#dc3545', border: 'none', background: 'none' }}><Trash2 size={16} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ textAlign: 'right', marginTop: '20px', fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-orange)' }}>
                                Tổng cộng: {formatCurrency(formData.items.reduce((sum, i) => sum + i.total_price, 0))}
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ border: '1px solid #ccc' }} onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">Lưu Đơn Hàng</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPreview && selectedOrder && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px' }}>
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
                                    Số phiếu: {selectedOrder.order_code}
                                </div>
                            </div>

                            {/* Info Section - Plain text layout */}
                            <div style={{ textAlign: 'left', marginBottom: '20px', fontSize: '14px' }}>
                                <p style={{ margin: '3px 0' }}><strong>Khách hàng:</strong> {selectedOrder.customers?.name}</p>
                                <p style={{ margin: '3px 0' }}><strong>Địa chỉ Cty:</strong> {selectedOrder.customers?.address}</p>
                                <p style={{ margin: '3px 0' }}><strong>Địa chỉ nhận hàng:</strong> {selectedOrder.customers?.delivery_location || selectedOrder.customers?.address || 'Như trên'}</p>
                                <p style={{ margin: '3px 0' }}><strong>Người nhận:</strong> {selectedOrder.customers?.receiver}</p>
                                <p style={{ margin: '3px 0' }}><strong>Liên hệ:</strong> <span style={{ fontWeight: 'bold' }}>{selectedOrder.delivery_phone || selectedOrder.customers?.phone}</span></p>
                                <p style={{ margin: '3px 0' }}><strong>Thanh toán:</strong> CK</p>
                            </div>

                            <p style={{ textAlign: 'left', marginBottom: '10px' }}>Chúng tôi xin giao các sản phẩm như sau:</p>

                            <table style={{ textAlign: 'center', borderCollapse: 'collapse', width: '100%', marginBottom: '30px', fontSize: '13px' }}>
                                <thead style={{ background: '#fff' }}>
                                    <tr>
                                        <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>STT</th>
                                        <th style={{ textAlign: 'center', border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>TÊN HÀNG</th>
                                        <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>ĐVT</th>
                                        <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>SL Yêu cầu</th>
                                        <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>SL Thực tế</th>
                                        <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>ĐƠN GIÁ</th>
                                        <th style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>THÀNH TIỀN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{ border: '1px solid black', padding: '10px' }}>{idx + 1}</td>
                                            <td style={{ textAlign: 'left', border: '1px solid black', padding: '10px' }}>{item.products?.name}</td>
                                            <td style={{ border: '1px solid black', padding: '10px' }}>{item.products?.unit}</td>
                                            <td style={{ border: '1px solid black', padding: '10px' }}>{item.quantity_requested || ''}</td>
                                            <td style={{ border: '1px solid black', padding: '10px' }}>{item.quantity_actual || ''}</td>
                                            <td style={{ textAlign: 'center', border: '1px solid black', padding: '10px' }}>{formatCurrency(item.unit_price)}</td>
                                            <td style={{ textAlign: 'center', border: '1px solid black', padding: '10px' }}>{item.quantity_actual ? formatCurrency(item.total_price) : ''}</td>
                                        </tr>
                                    ))}
                                    {selectedOrder.items?.some(i => i.quantity_actual) && (
                                        <tr>
                                            <td colSpan="5"></td>
                                            <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>Tổng cộng</td>
                                            <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold', textAlign: 'right' }}>
                                                {formatCurrency(selectedOrder.items.reduce((sum, i) => sum + (i.quantity_actual ? i.total_price : 0), 0))}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                                <p style={{ fontWeight: 'bold' }}>Ngày {new Date(selectedOrder.order_date).getDate()} tháng {new Date(selectedOrder.order_date).getMonth() + 1} năm {new Date(selectedOrder.order_date).getFullYear()}</p>
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
