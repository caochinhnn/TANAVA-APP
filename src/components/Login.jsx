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
            padding: '20px'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '430px',
                padding: '50px 40px',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '40px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, var(--primary-orange) 0%, #FFB347 100%)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 25px',
                        boxShadow: '0 10px 25px rgba(255, 140, 0, 0.4)'
                    }}>
                        <LogIn color="white" size={36} />
                    </div>
                    <h2 style={{ color: 'white', fontSize: '32px', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '2px' }}>TANAVA</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: '500' }}>Hệ thống quản lý thực phẩm</p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(220, 53, 69, 0.2)',
                        color: '#ff8a8a',
                        padding: '14px',
                        borderRadius: '12px',
                        marginBottom: '25px',
                        fontSize: '14px',
                        border: '1px solid rgba(220, 53, 69, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
                    <div className="form-group">
                        <label>Email Đăng Nhập</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '35px' }}>
                        <label>Mật Khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '16px',
                            borderRadius: '14px',
                            letterSpacing: '1px'
                        }}
                    >
                        {loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP HỆ THỐNG'}
                    </button>
                </form>

                <div style={{ marginTop: '40px', fontSize: '13px', color: 'var(--text-muted)', opacity: 0.6 }}>
                    © 2026 Tan Nam Vang Food. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default Login;
