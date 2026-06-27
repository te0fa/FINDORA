'use client'

import { useState } from 'react'

export function DynamicListEditor({ 
  initialItems, 
  fieldName, 
  itemSchema, 
  labels 
}: { 
  initialItems: any[], 
  fieldName: string, 
  itemSchema: any, 
  labels: any 
}) {
  const [items, setItems] = useState(initialItems)

  const addItem = () => {
    setItems([...items, { ...itemSchema }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateField = (index: number, field: string, value: string) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={fieldName} value={JSON.stringify(items)} />
      
      {items.map((item, index) => (
        <div key={index} className="glass-card p-4 space-y-3 relative border-white/5">
          <button 
            type="button" 
            onClick={() => removeItem(index)}
            className="absolute top-2 right-2 text-xs text-red-400 hover:text-red-300"
          >
            ✕
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.keys(itemSchema).map((key) => (
              <div key={key}>
                <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">
                  {labels[key] || key}
                </label>
                {key.includes('desc') || key.includes('answer') ? (
                   <textarea 
                     className="input-small w-full h-20"
                     value={item[key]}
                     onChange={(e) => updateField(index, key, e.target.value)}
                   />
                ) : (
                  <input 
                    type="text" 
                    className="input-small w-full"
                    value={item[key]}
                    onChange={(e) => updateField(index, key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button 
        type="button" 
        onClick={addItem}
        className="btn-secondary text-xs w-full py-2 border-dashed"
      >
        + {labels.add_item || 'Add Item'}
      </button>
    </div>
  )
}
