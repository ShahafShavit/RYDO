export default function AppLogo({ className = '' }) {
  return (
    <img
      src="/images/Logo-RYDO.png"
      alt="RYDO Logo"
      className={`app-logo w-20 ${className}`}
    />
  );
}

