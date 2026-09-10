import Dexie, { type Table } from 'dexie'

// ===== Types =====

export interface World {
  id: string
  title: string
  description: string
  parentId: string | null
  order: number
  createdAt: number
  updatedAt: number
}

export interface Character {
  id: string
  name: string
  avatar: string
  description: string
  traits: string[]
  createdAt: number
  updatedAt: number
}

export interface CharacterArc {
  id: string
  characterId: string
  storyId: string
  worldId: string
  summary: string
  changes: string
  order: number
  createdAt: number
  updatedAt: number
}

export interface Story {
  id: string
  worldId: string
  title: string
  content: string
  status: 'draft' | 'writing' | 'done'
  order: number
  createdAt: number
  updatedAt: number
}

export interface Fragment {
  id: string
  worldId: string
  storyId: string | null
  title: string
  content: string
  tags: string[]
  linkedCharacterIds: string[]
  linkedFragmentIds: string[]
  status: 'loose' | 'pasted'
  color: string
  order: number
  createdAt: number
  updatedAt: number
}

export interface CharacterRelation {
  id: string
  characterAId: string
  characterBId: string
  relationType: string
  description: string
  worldId: string | null
  createdAt: number
  updatedAt: number
}

// ===== Database =====

class NotevelistDB extends Dexie {
  worlds!: Table<World, string>
  characters!: Table<Character, string>
  characterArcs!: Table<CharacterArc, string>
  stories!: Table<Story, string>
  fragments!: Table<Fragment, string>
  characterRelations!: Table<CharacterRelation, string>

  constructor() {
    super('NotevelistDB')
    this.version(1).stores({
      worlds: 'id, parentId, order, createdAt, updatedAt',
      characters: 'id, name, createdAt, updatedAt',
      characterArcs: 'id, characterId, storyId, worldId, order, createdAt, updatedAt',
      stories: 'id, worldId, status, order, createdAt, updatedAt',
      fragments: 'id, worldId, storyId, status, order, createdAt, updatedAt, *tags',
      characterRelations: 'id, characterAId, characterBId, worldId, createdAt, updatedAt',
    })
  }
}

export const db = new NotevelistDB()

// ===== Helper =====

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function now(): number {
  return Date.now()
}

// ===== Export / Import (for sync) =====

export interface ExportData {
  version: number
  exportedAt: number
  worlds: World[]
  characters: Character[]
  characterArcs: CharacterArc[]
  stories: Story[]
  fragments: Fragment[]
  characterRelations: CharacterRelation[]
}

export async function exportAll(): Promise<ExportData> {
  const [worlds, characters, characterArcs, stories, fragments, characterRelations] =
    await Promise.all([
      db.worlds.toArray(),
      db.characters.toArray(),
      db.characterArcs.toArray(),
      db.stories.toArray(),
      db.fragments.toArray(),
      db.characterRelations.toArray(),
    ])

  return {
    version: 1,
    exportedAt: now(),
    worlds,
    characters,
    characterArcs,
    stories,
    fragments,
    characterRelations,
  }
}

export async function importAll(data: ExportData): Promise<void> {
  await db.transaction('rw', [db.worlds, db.characters, db.characterArcs, db.stories, db.fragments, db.characterRelations], async () => {
    await db.worlds.clear()
    await db.characters.clear()
    await db.characterArcs.clear()
    await db.stories.clear()
    await db.fragments.clear()
    await db.characterRelations.clear()

    if (data.worlds) await db.worlds.bulkAdd(data.worlds)
    if (data.characters) await db.characters.bulkAdd(data.characters)
    if (data.characterArcs) await db.characterArcs.bulkAdd(data.characterArcs)
    if (data.stories) await db.stories.bulkAdd(data.stories)
    if (data.fragments) await db.fragments.bulkAdd(data.fragments)
    if (data.characterRelations) await db.characterRelations.bulkAdd(data.characterRelations)
  })
}
