import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, genId, now, type Fragment } from '../db/database'

export const useFragmentStore = defineStore('fragment', () => {
  const fragments = ref<Fragment[]>([])
  const loading = ref(false)

  const FRAGMENT_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  ]

  async function loadByWorld(worldId: string) {
    loading.value = true
    fragments.value = await db.fragments
      .where('worldId')
      .equals(worldId)
      .reverse()
      .sortBy('createdAt')
    loading.value = false
  }

  async function loadByStory(storyId: string) {
    loading.value = true
    fragments.value = await db.fragments
      .where('storyId')
      .equals(storyId)
      .reverse()
      .sortBy('createdAt')
    loading.value = false
  }

  async function createFragment(data: Partial<Fragment>): Promise<string> {
    const id = genId()
    const ts = now()
    const maxOrder = fragments.value.length
    const frag: Fragment = {
      id,
      worldId: data.worldId || '',
      storyId: data.storyId || null,
      title: data.title || '',
      content: data.content || '',
      tags: data.tags || [],
      linkedCharacterIds: data.linkedCharacterIds || [],
      linkedFragmentIds: data.linkedFragmentIds || [],
      status: 'loose',
      color: data.color || FRAGMENT_COLORS[maxOrder % FRAGMENT_COLORS.length],
      order: maxOrder,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.fragments.add(frag)
    fragments.value.unshift(frag)
    return id
  }

  async function updateFragment(id: string, patch: Partial<Fragment>) {
    const patchData = { ...patch, updatedAt: now() }
    await db.fragments.update(id, patchData)
    const idx = fragments.value.findIndex((f) => f.id === id)
    if (idx >= 0) fragments.value[idx] = { ...fragments.value[idx], ...patchData }
  }

  async function deleteFragment(id: string) {
    await db.fragments.delete(id)
    fragments.value = fragments.value.filter((f) => f.id !== id)
  }

  async function pasteToStory(fragmentId: string, storyId: string) {
    await updateFragment(fragmentId, { storyId, status: 'pasted' })
  }

  async function unpinFromStory(fragmentId: string) {
    await updateFragment(fragmentId, { storyId: null, status: 'loose' })
  }

  return {
    fragments,
    loading,
    FRAGMENT_COLORS,
    loadByWorld,
    loadByStory,
    createFragment,
    updateFragment,
    deleteFragment,
    pasteToStory,
    unpinFromStory,
  }
})
