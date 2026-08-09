import type { PageItem } from '../types'

export function reorderPages(
  pages: PageItem[],
  activeId: string,
  overId: string,
): PageItem[] {
  const oldIndex = pages.findIndex((page) => page.id === activeId)
  const newIndex = pages.findIndex((page) => page.id === overId)
  if (oldIndex < 0 || newIndex < 0) return pages

  const next = [...pages]
  const [moved] = next.splice(oldIndex, 1)
  next.splice(newIndex, 0, moved)
  return next
}
