import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/shared/constants/roles';
import Button from '@/shared/components/ui/button/Button';
import Input from '@/shared/components/ui/input/Input';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
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
      const user = await login(form.email, form.password);
      navigate(user.role === ROLES.ADMIN ? ROUTES.admin : ROUTES.dashboard);
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div>
          <h1 className="text-2xl font-semibold">Login to RYDO</h1>
        </div>

        <FormField label="Email">
          <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter your email" required />
        </FormField>

        <FormField label="Password">
          <Input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Enter your password" required />
        </FormField>

        <Button type="submit" variant="neon" className="w-full" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Login'}</Button>

        {error && <p className="text-red-400">{error}</p>}

        <p className="text-sm text-white/56">
          No account yet? <Link to={ROUTES.register} className="text-white underline">Register</Link>
        </p>
      </form>
    </Card>
  );
}
