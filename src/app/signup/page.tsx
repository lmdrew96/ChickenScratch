import { SignUp } from '@clerk/nextjs'
import PageHeader from '@/components/shell/page-header'

export const metadata = { title: 'Sign Up' }

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Sign Up" />
      <div className="mx-auto mt-6 flex justify-center">
        <SignUp routing="path" path="/signup" signInUrl="/login" />
      </div>
    </div>
  )
}
