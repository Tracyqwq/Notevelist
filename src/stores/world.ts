import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, genId, now, type World } from '../db/database'

export const useWorldStore = defineStore('world', () => {
  const worlds = ref<World[]>([])
  const currentWorldId = ref<string | null>(null)
  const loading = ref(false)

  const rootWorlds = computed(() =>
    worlds.value
      .filter((w) => w.parentId === null)
      .sort((a, b) => a.order - b.order)
  )

  function childrenOf(parentId: string | null): World[] {
    return worlds.value
      .filter((w) => w.parentId === parentId)
      .sort((a, b) => a.order - b.order)
  }

  const currentWorld = computed(() =>
    worlds.value.find((w) => w.id === currentWorldId.value) || null
  )

  async function loadAll() {
    loading.value = true
    worlds.value = await db.worlds.orderBy('createdAt').toArray()
    loading.value = false
  }

  async function createWorld(data: Partial<World>): Promise<string> {
    const id = genId()
    const ts = now()
    const maxOrder = await db.worlds
      .where('parentId')
      .equals(data.parentId || null as any)
      .count()

    const world: World = {
      id,
      title: data.title || '新世界观',
      description: data.description || '',
      parentId: data.parentId || null,
      order: maxOrder,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.worlds.add(world)
    worlds.value.push(world)
    return id
  }

  async function updateWorld(id: string, patch: Partial<World>) {
    const patchData = { ...patch, updatedAt: now() }
    await db.worlds.update(id, patchData)
    const idx = worlds.value.findIndex((w) => w.id === id)
    if (idx >= 0) worlds.value[idx] = { ...worlds.value[idx], ...patchData }
  }

  async function deleteWorld(id: string) {
    // Recursively delete children
    const children = childrenOf(id)
    for (const child of children) {
      await deleteWorld(child.id)
    }
    // Delete stories in this world
    const stories = await db.stories.where('worldId').equals(id).toArray()
    for (const story of stories) {
      await db.stories.delete(story.id)
    }
    // Delete fragments in this world
    const fragments = await db.fragments.where('worldId').equals(id).toArray()
    for (const frag of fragments) {
      await db.fragments.delete(frag.id)
    }
    // Delete the world itself
    await db.worlds.delete(id)
    worlds.value = worlds.value.filter((w) => w.id !== id)
  }

  function selectWorld(id: string | null) {
    currentWorldId.value = id
  }

  return {
    worlds,
    currentWorldId,
    loading,
    rootWorlds,
    currentWorld,
    childrenOf,
    loadAll,
    createWorld,
    updateWorld,
    deleteWorld,
    selectWorld,
  }
})
