import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, genId, now, type Character, type CharacterArc, type CharacterRelation } from '../db/database'

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<Character[]>([])
  const characterArcs = ref<CharacterArc[]>([])
  const relations = ref<CharacterRelation[]>([])
  const loading = ref(false)

  async function loadAll() {
    loading.value = true
    const [chars, arcs, rels] = await Promise.all([
      db.characters.orderBy('createdAt').toArray(),
      db.characterArcs.orderBy('order').toArray(),
      db.characterRelations.orderBy('createdAt').toArray(),
    ])
    characters.value = chars
    characterArcs.value = arcs
    relations.value = rels
    loading.value = false
  }

  async function createCharacter(data: Partial<Character>): Promise<string> {
    const id = genId()
    const ts = now()
    const char: Character = {
      id,
      name: data.name || '新角色',
      avatar: data.avatar || '',
      description: data.description || '',
      traits: data.traits || [],
      createdAt: ts,
      updatedAt: ts,
    }
    await db.characters.add(char)
    characters.value.push(char)
    return id
  }

  async function updateCharacter(id: string, patch: Partial<Character>) {
    const patchData = { ...patch, updatedAt: now() }
    await db.characters.update(id, patchData)
    const idx = characters.value.findIndex((c) => c.id === id)
    if (idx >= 0) characters.value[idx] = { ...characters.value[idx], ...patchData }
  }

  async function deleteCharacter(id: string) {
    // Delete arcs
    const arcs = characterArcs.value.filter((a) => a.characterId === id)
    for (const arc of arcs) {
      await db.characterArcs.delete(arc.id)
    }
    // Delete relations
    const rels = relations.value.filter((r) => r.characterAId === id || r.characterBId === id)
    for (const rel of rels) {
      await db.characterRelations.delete(rel.id)
    }
    await db.characters.delete(id)
    characters.value = characters.value.filter((c) => c.id !== id)
    characterArcs.value = characterArcs.value.filter((a) => a.characterId !== id)
    relations.value = relations.value.filter((r) => r.characterAId !== id && r.characterBId !== id)
  }

  function arcsOfCharacter(characterId: string): CharacterArc[] {
    return characterArcs.value
      .filter((a) => a.characterId === characterId)
      .sort((a, b) => a.order - b.order)
  }

  function relationsOfCharacter(characterId: string): CharacterRelation[] {
    return relations.value.filter(
      (r) => r.characterAId === characterId || r.characterBId === characterId
    )
  }

  async function createArc(data: Partial<CharacterArc>): Promise<string> {
    const id = genId()
    const ts = now()
    const existingArcs = arcsOfCharacter(data.characterId || '')
    const arc: CharacterArc = {
      id,
      characterId: data.characterId || '',
      storyId: data.storyId || '',
      worldId: data.worldId || '',
      summary: data.summary || '',
      changes: data.changes || '',
      order: existingArcs.length,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.characterArcs.add(arc)
    characterArcs.value.push(arc)
    return id
  }

  async function createRelation(data: Partial<CharacterRelation>): Promise<string> {
    const id = genId()
    const ts = now()
    const rel: CharacterRelation = {
      id,
      characterAId: data.characterAId || '',
      characterBId: data.characterBId || '',
      relationType: data.relationType || '',
      description: data.description || '',
      worldId: data.worldId || null,
      createdAt: ts,
      updatedAt: ts,
    }
    await db.characterRelations.add(rel)
    relations.value.push(rel)
    return id
  }

  return {
    characters,
    characterArcs,
    relations,
    loading,
    loadAll,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    arcsOfCharacter,
    relationsOfCharacter,
    createArc,
    createRelation,
  }
})
