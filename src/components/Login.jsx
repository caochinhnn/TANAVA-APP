import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message === 'Invalid login credentials' ? 'Email hoặc mật khẩu không chính xác' : error.message);
        }
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FFF5E6 0%, #FFFFFF 100%)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: 'white',
                padding: '40px',
                borderRadius: '20px',
                boxShadow: '0 20px 40px rgba(255, 140, 0, 0.1)',
                border: '1px solid #FFE0B3'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '70px',
                        height: '70px',
                        background: 'var(--primary-orange)',
                        borderRadius: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 8px 16px rgba(255, 140, 0, 0.3)'
                    }}>
                        <LogIn color="white" size={32} />
                    </div>
                    <h2 style={{ color: 'var(--text-black)', fontSize: '28px', fontWeight: '800', margin: '0 0 10px 0' }}>TANAVA ADMIN</h2>
                    <p style={{ color: '#666', fontSize: '14px' }}>Vui lòng đăng nhập để quản lý hệ thống</p>
                </div>

                {error && (
                    <div style={{
                        background: '#FFF0F0',
                        color: '#D8000C',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        textAlign: 'center',
                        border: '1px solid #FFD2D2'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="username@email.com"
                            required
                            style={{
                                marginTop: '8px',
                                padding: '12px 15px',
                                border: '2px solid #F0F0F0',
                                borderRadius: '10px',
                                transition: 'all 0.3s ease',
                                fontSize: '15px'
                            }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '30px' }}>
                        <label style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                                marginTop: '8px',
                                padding: '12px 15px',
                                border: '2px solid #F0F0F0',
                                borderRadius: '10px',
                                transition: 'all 0.3s ease',
                                fontSize: '15px'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '14px',
                            fontSize: '16px',
                            borderRadius: '10px',
                            background: loading ? '#CCC' : 'var(--primary-orange)',
                            boxShadow: '0 4px 12px rgba(255, 140, 0, 0.2)',
                            transition: 'transform 0.2s active'
                        }}
                    >
                        {loading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
                    </button>
                </form>

                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#AAA' }}>
                    © 2026 Admin Panel. Designed with excellence.
                </div>
            </div>
        </div>
    );
};

export default Login;
