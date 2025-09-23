import { redirect } from 'next/navigation';
import PageHeader from '@/components/shell/page-header';

export default function Home() {
  redirect('/published');
}

<PageHeader title="Home" />
