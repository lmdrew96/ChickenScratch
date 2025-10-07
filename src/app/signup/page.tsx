import PageHeader from '@/components/shell/page-header'
import SignupForm from '@/components/forms/signup-form'

export const metadata = { title: 'Sign Up' }

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Sign Up" />
      <div className="mx-auto mt-6 max-w-4xl">
        <SignupForm />
      </div>
    </div>
  )
}
