import { LoginForm } from './login-form';

export const metadata = { title: '로그인' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string }>;
}) {
  const { blocked } = await searchParams;
  return <LoginForm blocked={blocked === '1'} />;
}
