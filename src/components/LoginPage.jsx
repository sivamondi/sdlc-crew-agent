import { useState, useEffect } from 'react';
import { Key, LogIn, UserPlus, AlertCircle, Building2, Plus } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { get } from '../utils/apiClient';

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({
    customerName: '', customerId: '', name: '', email: '', password: '', confirmPassword: '',
  });
  const [organizations, setOrganizations] = useState([]);
  const [orgMode, setOrgMode] = useState('existing'); // 'existing' | 'new'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuthStore();

  // Fetch organizations when signup mode is shown
  useEffect(() => {
    if (isSignup) {
      get('/api/auth/organizations')
        .then((orgs) => {
          setOrganizations(orgs || []);
          if (orgs?.length > 0) {
            setOrgMode('existing');
            setForm((f) => ({ ...f, customerId: orgs[0].id }));
          } else {
            setOrgMode('new');
          }
        })
        .catch(() => setOrganizations([]));
    }
  }, [isSignup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
          throw new Error('All fields are required');
        }
        if (orgMode === 'new' && !form.customerName.trim()) {
          throw new Error('Organization name is required');
        }
        if (orgMode === 'existing' && !form.customerId) {
          throw new Error('Please select an organization');
        }
        if (form.password !== form.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (form.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        await signup(
          orgMode === 'new' ? form.customerName : null,
          form.name,
          form.email,
          form.password,
          orgMode === 'existing' ? form.customerId : null,
        );
      } else {
        if (!form.email.trim() || !form.password.trim()) {
          throw new Error('Email and password are required');
        }
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="api-key-setup">
      <div className="api-key-card" style={{ maxWidth: 420 }}>
        <div className="api-key-icon">
          <Key size={40} />
        </div>
        <h2>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          {isSignup
            ? 'Join an existing organization or create a new one.'
            : 'Sign in to your Cognia SDLC Crew account.'}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              {/* Organization Selection */}
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={13} /> Organization
                </label>

                {organizations.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setOrgMode('existing');
                        if (organizations.length > 0) updateField('customerId', organizations[0].id);
                      }}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid',
                        borderColor: orgMode === 'existing' ? 'var(--accent)' : 'var(--border)',
                        background: orgMode === 'existing' ? 'rgba(99,102,241,0.08)' : 'white',
                        color: orgMode === 'existing' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      <Building2 size={12} /> Join Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrgMode('new')}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid',
                        borderColor: orgMode === 'new' ? 'var(--accent)' : 'var(--border)',
                        background: orgMode === 'new' ? 'rgba(99,102,241,0.08)' : 'white',
                        color: orgMode === 'new' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}
                    >
                      <Plus size={12} /> Create New
                    </button>
                  </div>
                )}

                {orgMode === 'existing' && organizations.length > 0 ? (
                  <select
                    className="input"
                    value={form.customerId}
                    onChange={(e) => updateField('customerId', e.target.value)}
                    style={{ fontSize: 14 }}
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="input"
                    type="text"
                    value={form.customerName}
                    onChange={(e) => updateField('customerName', e.target.value)}
                    placeholder="Your company or team name"
                    autoFocus
                  />
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Your Name</label>
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
            </>
          )}

          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="you@company.com"
              autoFocus={!isSignup}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Password</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {isSignup && (
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 12 }}>Confirm Password</label>
              <input
                className="input"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: 12, marginBottom: 10,
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading ? (
              'Please wait...'
            ) : isSignup ? (
              <><UserPlus size={16} /> {orgMode === 'existing' ? 'Join Organization' : 'Create Account'}</>
            ) : (
              <><LogIn size={16} /> Sign In</>
            )}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {isSignup ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setIsSignup(false); setError(''); }}
                style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => { setIsSignup(true); setError(''); }}
                style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                Create one
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
