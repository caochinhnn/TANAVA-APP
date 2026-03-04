import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        tax_id: '',
        delivery_location: '',
        receiver: '',
        pic: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) setShowModal(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name', { ascending: true });

        if (error) console.error('Error fetching customers:', error);
        else setCustomers(data || []);
        setLoading(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'code' && value.length > 3) return;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.code.length !== 3) {
            alert('Mã khách hàng phải đúng 3 ký tự!');
            return;
        }

        if (editingCustomer) {
            const { error } = await supabase
                .from('customers')
                .update(formData)
                .eq('id', editingCustomer.id);
            if (error) alert('Lỗi khi cập nhật!');
            else {
                setShowModal(false);
                fetchCustomers();
            }
        } else {
            const { error } = await supabase
                .from('customers')
                .insert([formData]);
            if (error) alert('Lỗi khi tạo mới (Mã KH có thể đã tồn tại)!');
            else {
                setShowModal(false);
                fetchCustomers();
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) alert('Lỗi khi xóa!');
            else fetchCustomers();
        }
    };

    const openAddModal = () => {
        setEditingCustomer(null);
        setFormData({
            name: '', code: '', address: '', tax_id: '',
            delivery_location: '', receiver: '', pic: '', phone: '', email: ''
        });
        setShowModal(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            code: customer.code,
            address: customer.address || '',
            tax_id: customer.tax_id || '',
            delivery_location: customer.delivery_location || '',
            receiver: customer.receiver || '',
            pic: customer.pic || '',
            phone: customer.phone || '',
            email: customer.email || ''
        });
        setShowModal(true);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <h2>QUẢN LÝ KHÁCH HÀNG</h2>
                <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} /> Thêm Mới
                </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc mã..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '35px', width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <Search size={20} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
            </div>

            {loading ? (
                <p>Đang tải dữ liệu...</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Tên Khách Hàng</th>
                            <th>Mã KH</th>
                            <th>MST</th>
                            <th>Số Điện Thoại</th>
                            <th>Email</th>
                            <th>Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id} className="row-hover-details">
                                <td style={{ fontWeight: 'bold', textAlign: 'left' }}>{customer.name}</td>
                                <td>{customer.code}</td>
                                <td>{customer.tax_id}</td>
                                <td>{customer.phone}</td>
                                <td>{customer.email}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                        <button onClick={() => openEditModal(customer)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007bff' }}>
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(customer.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>

                                {/* Information Overlay on Hover */}
                                <div className="details-tooltip">
                                    <h4 style={{ color: 'var(--primary-orange)', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '10px' }}>
                                        Chi Tiết Khách Hàng
                                    </h4>
                                    <p><strong>Tên:</strong> {customer.name}</p>
                                    <p><strong>Mã:</strong> {customer.code}</p>
                                    <p><strong>Địa chỉ:</strong> {customer.address}</p>
                                    <p><strong>MST:</strong> {customer.tax_id}</p>
                                    <p><strong>Địa điểm giao:</strong> {customer.delivery_location}</p>
                                    <p><strong>Người nhận:</strong> {customer.receiver}</p>
                                    <p><strong>Người phụ trách:</strong> {customer.pic}</p>
                                    <p><strong>SĐT:</strong> {customer.phone}</p>
                                    <p><strong>Email:</strong> {customer.email}</p>
                                </div>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3>{editingCustomer ? 'CHỈNH SỬA KHÁCH HÀNG' : 'THÊM KHÁCH HÀNG MỚI'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Tên Khách Hàng *</label>
                                <input name="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Mã KH (3 ký tự) *</label>
                                    <input name="code" value={formData.code} onChange={handleInputChange} required maxLength={3} />
                                </div>
                                <div className="form-group">
                                    <label>Mã Số Thuế</label>
                                    <input name="tax_id" value={formData.tax_id} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Địa Chỉ</label>
                                <input name="address" value={formData.address} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Địa Điểm Giao Hàng</label>
                                <input name="delivery_location" value={formData.delivery_location} onChange={handleInputChange} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Người Nhận</label>
                                    <input name="receiver" value={formData.receiver} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Người Phụ Trách</label>
                                    <input name="pic" value={formData.pic} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Số Điện Thoại</label>
                                    <input name="phone" value={formData.phone} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ border: '1px solid #ccc' }} onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editingCustomer ? 'Cập Nhật' : 'Lưu Lại'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
