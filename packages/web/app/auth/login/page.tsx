import { API_URL } from '../../../lib/api';

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-4 text-2xl font-bold">Sign in</h1>
      <p className="mb-6 text-zinc-400">Publish and manage your skills with GitHub.</p>
      <a
        href={`${API_URL}/auth/github`}
        className="inline-block rounded-lg bg-zinc-100 px-6 py-3 font-medium text-zinc-900 hover:bg-white"
      >
        Continue with GitHub
      </a>
    </div>
  );
}
