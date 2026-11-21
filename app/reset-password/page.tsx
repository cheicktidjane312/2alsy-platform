import ResetPasswordForm from './ResetPasswordForm'

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams

  return <ResetPasswordForm expired={expired === '1'} />
}
