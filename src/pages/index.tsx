import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 20 }}>
      <h1>Realty Nexus — Public Property Feed (Alpha)</h1>
      <p>This is a minimal index page for Sprint 1.</p>
      <ul>
        <li><Link href="/role-selection">Role selection / Login</Link></li>
        <li><Link href="/register-builder">Register Builder (Director)</Link></li>
        <li><Link href="/superadmin/verification">Super Admin — Verification Queue</Link></li>
      </ul>
    </main>
  );
}