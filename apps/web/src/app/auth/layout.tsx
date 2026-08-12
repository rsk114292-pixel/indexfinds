import AntdProvider from '@/components/AntdProvider';

export default function AuthCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AntdProvider>{children}</AntdProvider>;
}
