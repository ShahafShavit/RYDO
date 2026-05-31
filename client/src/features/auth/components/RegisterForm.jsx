import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/shared/constants/roles';
import Button from '@/shared/components/ui/button/Button';
import Input from '@/shared/components/ui/input/Input';
import PasswordInput from '@/shared/components/ui/input/PasswordInput';
import Card from '@/shared/components/ui/card/Card';
import FormField from '@/shared/components/ui/form-field/FormField';
import { validateHandle, normalizeHandleInput } from '@/features/users/utils/handle-validation';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', handle: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const handleErr = validateHandle(form.handle);
    if (handleErr) {
      setError(handleErr);
      return;
    }

    setIsLoading(true);
    try {
      const user = await register(
        form.firstName,
        form.lastName,
        normalizeHandleInput(form.handle),
        form.email,
        form.password,
      );
      navigate(user.role === ROLES.ADMIN ? ROUTES.admin : ROUTES.dashboard);
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
        </div>

        <FormField label="First name">
          <Input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Enter your first name" required />
        </FormField>

        <FormField label="Last name">
          <Input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Enter your last name" required />
        </FormField>

        <FormField label="Handle">
          <Input
            name="handle"
            value={form.handle}
            onChange={handleChange}
            placeholder="johncyclist"
            autoComplete="username"
            required
          />
          <p className="mt-1 text-xs text-fg-muted">Your public profile URL: /users/yourhandle</p>
        </FormField>

        <FormField label="Email">
          <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter your email" required />
        </FormField>

        <FormField label="Password">
          <PasswordInput name="password" value={form.password} onChange={handleChange} placeholder="Create a password" autoComplete="new-password" required />
        </FormField>

        <Button type="submit" variant="neon" className="w-full" disabled={isLoading}>{isLoading ? 'Creating…' : 'Create account'}</Button>

        {error && <p className="text-red-400">{error}</p>}
        <p className="text-sm text-fg-muted">
          Already have an account? <Link to={ROUTES.login} className="text-fg underline">Login</Link>
        </p>
      </form>
    </Card>
  );
}
