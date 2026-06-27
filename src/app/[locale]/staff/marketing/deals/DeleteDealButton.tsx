'use client'

import { handleDeleteDeal } from './actions'

interface Props {
  id: string
  locale: string
  label: string
  confirmMsg: string
}

export default function DeleteDealButton({ id, locale, label, confirmMsg }: Props) {
  return (
    <form 
      action={handleDeleteDeal} 
      onSubmit={(e) => {
        if (!window.confirm(confirmMsg)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <button 
        type="submit" 
        className="text-xs px-3 py-1 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
        data-testid="deal-delete-button"
      >
        {label}
      </button>
    </form>
  )
}
