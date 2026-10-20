import { RequestSkeleton } from '@/components/workspace/screen-skeletons';

// Without this the nearest boundary is the dashboard's, which is shaped like Today.
export default function RequestLoading() {
  return <RequestSkeleton />;
}
