import React from 'react'
import RequestWizardClient from './RequestWizardClient'

export const metadata = {
  title: 'Start Your Request — FINDORA',
}

export default async function StartRequestPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  return (
    <div className="min-h-screen bg-[hsl(220,25%,8%)] text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-3xl w-full">
        <RequestWizardClient locale={locale} />
      </div>
    </div>
  )
}