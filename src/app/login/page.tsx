import PageHeader from '@/components/shell/page-header'
import LoginForm from '@/components/forms/login-form'

export const metadata = { title: 'Login' }

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Login" />
      <div className="mx-auto mt-6 max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}
