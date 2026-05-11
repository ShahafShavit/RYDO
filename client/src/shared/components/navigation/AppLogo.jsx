// export default function AppLogo({ className = '' }) {
//   return <span className={`rydo-brand text-lg font-bold uppercase ${className}`}>RYDO</span>;
// }
export default function AppLogo({ className = '' }) {
  return (
    <img
      src="/images/Logo-RYDO.png"
      alt="RYDO Logo"
      className={`app-logo w-20 ${className}`}
    />
  );
}

