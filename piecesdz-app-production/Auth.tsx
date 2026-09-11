import React, { useState } from 'react';
import { supabase } from './supabaseClient'; // استدعاء ملف الاتصال الذي أنشأته في الخطوة الأولى

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // للتبديل بين تسجيل الدخول وإنشاء حساب جديد

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // إنشاء حساب جديد
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
      } else {
        alert('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.');
      }
    } else {
      // تسجيل الدخول
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>{isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h2>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px', background: '#007BFF', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? 'جاري المعالجة...' : isSignUp ? 'تسجيل' : 'دخول'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
        {isSignUp ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}{' '}
        <span
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ color: '#007BFF', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isSignUp ? 'تسجيل الدخول' : 'أنشئ حساباً جديداً'}
        </span>
      </p>
    </div>
  );
}
