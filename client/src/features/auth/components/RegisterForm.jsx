import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Button from '@/shared/components/ui/button/Button';
import Input from '@/shared/components/ui/input/Input';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const user = await register(form.fullName, form.email, form.password);
      navigate(user.role === 'admin' ? ROUTES.admin : ROUTES.dashboard);
    } catch (err) {
      setError(err?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div>
          <h1 className="text-2xl font-semibold">Create your RYDO account</h1>
          <p className="mt-2 text-white/64">Join the platform for routes, group rides, hazards and challenges.</p>
        </div>

        <FormField label="Full name">
          <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter your full name" required />
        </FormField>

        <FormField label="Email">
          <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter your email" required />
        </FormField>

        <FormField label="Password">
          <Input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create a password" required />
        </FormField>

        <Button type="submit" variant="neon" className="w-full" disabled={isLoading}>{isLoading ? 'Creating…' : 'Create account'}</Button>

        {error && <p className="text-red-400">{error}</p>}
        <p className="text-sm text-white/56">
          Already have an account? <Link to={ROUTES.login} className="text-white underline">Login</Link>
        </p>
      </form>
    </Card>
  );
}
