import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit, Trash2, Search, X, DollarSign } from 'lucide-react';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        unit: '',
        default_price: 0
    });

    const [customerPrices, setCustomerPrices] = useState([]);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) {
                setShowModal(false);
                setShowPriceModal(false);
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
        const { data: pData } = await supabase.from('products').select('*').order('name', { ascending: true });
        const { data: cData } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
        setProducts(pData || []);
        setCustomers(cData || []);
        setLoading(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingProduct) {
            const { error } = await supabase.from('products').update(formData).eq('id', editingProduct.id);
            if (error) alert('Lỗi khi cập nhật!');
            else { setShowModal(false); fetchData(); }
        } else {
            const { error } = await supabase.from('products').insert([formData]);
            if (error) alert('Lỗi khi tạo mới!');
            else { setShowModal(false); fetchData(); }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) alert('Lỗi khi xóa!');
            else fetchData();
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const openPriceModal = async (product) => {
        setSelectedProduct(product);
        const { data } = await supabase
            .from('customer_product_prices')
            .select('*, customers(name)')
            .eq('product_id', product.id);
        setCustomerPrices(data || []);
        setShowPriceModal(true);
    };

    const handleAddCustomerPrice = async (e) => {
        e.preventDefault();
        const customer_id = e.target.customer_id.value;
        const price = e.target.price.value;

        const { error } = await supabase.from('customer_product_prices').upsert({
            customer_id,
            product_id: selectedProduct.id,
            price
        });

        if (error) alert('Lỗi khi lưu giá riêng!');
        else {
            openPriceModal(selectedProduct);
            e.target.reset();
        }
    };

    const deleteCustomerPrice = async (id) => {
        const { error } = await supabase.from('customer_product_prices').delete().eq('id', id);
        if (error) alert('Lỗi khi xóa!');
        else openPriceModal(selectedProduct);
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <h2>QUẢN LÝ SẢN PHẨM</h2>
                <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setFormData({ name: '', unit: '', default_price: 0 }); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} /> Thêm Mới
                </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Tìm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '35px', width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <Search size={20} style={{ position: 'absolute', left: '10px', top: '10px', color: '#888' }} />
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Tên Sản Phẩm</th>
                        <th>Đơn Vị Tính</th>
                        <th>Đơn Giá Mặc Định</th>
                        <th>Thao Tác</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredProducts.map(product => (
                        <tr key={product.id}>
                            <td className="text-left" style={{ fontWeight: 'bold' }}>{product.name}</td>
                            <td>{product.unit}</td>
                            <td>{formatCurrency(product.default_price)}</td>
                            <td>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                    <button title="Giá riêng khách hàng" onClick={() => openPriceModal(product)} style={{ color: '#ff8c00', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <DollarSign size={18} />
                                    </button>
                                    <button onClick={() => { setEditingProduct(product); setFormData({ name: product.name, unit: product.unit, default_price: product.default_price }); setShowModal(true); }} style={{ color: '#007bff', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(product.id)} style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Product Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3>{editingProduct ? 'CHỈNH SỬA SẢN PHẨM' : 'THÊM SẢN PHẨM MỚI'}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Tên Sản Phẩm *</label>
                                <input name="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Đơn Vị Tính</label>
                                <input name="unit" value={formData.unit} onChange={handleInputChange} placeholder="Kg, Thùng, Bó..." />
                            </div>
                            <div className="form-group">
                                <label>Đơn Giá Mặc Định</label>
                                <input type="number" name="default_price" value={formData.default_price} onChange={handleInputChange} />
                            </div>
                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" style={{ border: '1px solid #ccc' }} onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pricing Modal */}
            {showPriceModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '700px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3>BẢNG GIÁ RIÊNG: {selectedProduct?.name}</h3>
                            <button onClick={() => setShowPriceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddCustomerPrice} style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                                <label>Chọn Khách Hàng</label>
                                <select name="customer_id" required>
                                    <option value="">-- Chọn khách hàng --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                <label>Giá Riêng</label>
                                <input type="number" name="price" required />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ height: '40px' }}>Thêm</button>
                        </form>

                        <table style={{ textAlign: 'left' }}>
                            <thead>
                                <tr>
                                    <th>Tên Khách Hàng</th>
                                    <th>Giá Áp Dụng</th>
                                    <th>Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerPrices.map(cp => (
                                    <tr key={cp.id}>
                                        <td>{cp.customers?.name}</td>
                                        <td style={{ fontWeight: 'bold' }}>{formatCurrency(cp.price)}</td>
                                        <td>
                                            <button onClick={() => deleteCustomerPrice(cp.id)} style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {customerPrices.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Chưa có giá riêng nào.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;
