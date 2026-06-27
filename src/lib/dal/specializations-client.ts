export interface Specialization {
  id:            string
  slug:          string
  name_en:       string
  name_ar:       string
  parent_id:     string | null
  is_active:     boolean
  display_order: number
  is_beachhead?:  boolean
  priority_stars?: number
  description_ar?: string | null
  description_en?: string | null
  target_merchants?: number
  target_deals?: number
  criteria_json?:   any
  created_at:    string
  updated_at:    string
}

export interface SpecializationTree extends Specialization {
  children: SpecializationTree[]
}

/**
 * Returns a flat array of {value, label_en, label_ar, level} suitable for select dropdowns.
 * Indents sub-categories with a dash prefix.
 */
export function flattenTreeForSelect(
  tree: SpecializationTree[],
  level = 0
): Array<{ id: string; slug: string; name_en: string; name_ar: string; level: number; hasChildren: boolean }> {
  const result: ReturnType<typeof flattenTreeForSelect> = []
  for (const node of tree) {
    result.push({
      id:          node.id,
      slug:        node.slug,
      name_en:     node.name_en,
      name_ar:     node.name_ar,
      level,
      hasChildren: node.children.length > 0,
    })
    if (node.children.length > 0) {
      result.push(...flattenTreeForSelect(node.children, level + 1))
    }
  }
  return result
}
