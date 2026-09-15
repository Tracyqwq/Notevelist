import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, genId, now, type Story } from '../db/database'
import { useErrorStore } from './error'

export const useStoryStore = defineStore('story', () => {
  const errorStore = useErrorStore()
  const stories = ref<Story[]>([])
  const currentStoryId = ref<string | null>(null)
  const loading = ref(false)

  const currentStory = computed(() =>
    stories.value.find((s) => s.id === currentStoryId.value) || null
  )

  async function loadByWorld(worldId: string) {
    loading.value = true
    stories.value = await db.stories
      .where('worldId')
      .equals(worldId)
      .sortBy('order')
    loading.value = false
  }

  async function createStory(data: Partial<Story>): Promise<string> {
    try {
      const id = genId()
      const ts = now()
      const maxOrder = stories.value.length
      const story: Story = {
        id,
        worldId: data.worldId || '',
        title: data.title || '新故事',
        content: '',
        status: 'draft',
        order: maxOrder,
        createdAt: ts,
        updatedAt: ts,
      }
      await db.stories.add(story)
      stories.value.push(story)
      return id
    } catch (e) {
      errorStore.reportError('创建故事失败', e)
      return ''
    }
  }

  async function updateStory(id: string, patch: Partial<Story>) {
    try {
      const patchData = { ...patch, updatedAt: now() }
      await db.stories.update(id, patchData)
      const idx = stories.value.findIndex((s) => s.id === id)
      if (idx >= 0) stories.value[idx] = { ...stories.value[idx], ...patchData }
    } catch (e) {
      errorStore.reportError('保存故事失败', e)
    }
  }

  async function deleteStory(id: string) {
    try {
      // Unpin fragments linked to this story
      const frags = await db.fragments.where('storyId').equals(id).toArray()
      for (const frag of frags) {
        await db.fragments.update(frag.id, { storyId: null, status: 'loose' })
      }
      await db.stories.delete(id)
      stories.value = stories.value.filter((s) => s.id !== id)
    } catch (e) {
      errorStore.reportError('删除故事失败', e)
    }
  }

  function selectStory(id: string | null) {
    currentStoryId.value = id
  }

  return {
    stories,
    currentStoryId,
    loading,
    currentStory,
    loadByWorld,
    createStory,
    updateStory,
    deleteStory,
    selectStory,
  }
})
