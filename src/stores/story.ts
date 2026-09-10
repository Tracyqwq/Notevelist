import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, genId, now, type Story } from '../db/database'

export const useStoryStore = defineStore('story', () => {
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
  }

  async function updateStory(id: string, patch: Partial<Story>) {
    const patchData = { ...patch, updatedAt: now() }
    await db.stories.update(id, patchData)
    const idx = stories.value.findIndex((s) => s.id === id)
    if (idx >= 0) stories.value[idx] = { ...stories.value[idx], ...patchData }
  }

  async function deleteStory(id: string) {
    // Unpin fragments linked to this story
    const frags = await db.fragments.where('storyId').equals(id).toArray()
    for (const frag of frags) {
      await db.fragments.update(frag.id, { storyId: null, status: 'loose' })
    }
    await db.stories.delete(id)
    stories.value = stories.value.filter((s) => s.id !== id)
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

// Need to import computed
import { computed } from 'vue'
