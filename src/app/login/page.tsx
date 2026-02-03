import { SignIn } from '@clerk/nextjs'
import PageHeader from '@/components/shell/page-header'

export const metadata = { title: 'Login' }

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Login" />
      <div className="mx-auto mt-6 flex justify-center">
        <SignIn routing="path" path="/login" signUpUrl="/signup" />
      </div>
    </div>
  )
}
