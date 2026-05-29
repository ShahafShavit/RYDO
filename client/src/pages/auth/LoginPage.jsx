import LoginForm from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <section className="rydo-container flex flex-1 flex-col items-center justify-center px-4 py-8 md:py-16">
      <LoginForm />
    </section>
  );
}
