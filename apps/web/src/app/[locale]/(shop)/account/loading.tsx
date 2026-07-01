import { Spinner } from '@/components/ui/Spinner';

export default function AccountLoading() {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Spinner size="lg" />
    </div>
  );
}
