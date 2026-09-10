<template>
  <div class="char-detail">
    <div class="detail-header">
      <NButton quaternary @click="router.back()">← 返回</NButton>
    </div>
    <div v-if="char" class="detail-body">
      <!-- Character Info -->
      <div class="char-section">
        <div class="char-section-header">
          <h1>{{ char.name }}</h1>
          <NButton size="small" @click="showEdit = true">编辑</NButton>
        </div>
        <div class="char-traits" v-if="char.traits.length">
          <NTag v-for="t in char.traits" :key="t">{{ t }}</NTag>
        </div>
        <div class="char-description">{{ char.description || '暂无描述' }}</div>
      </div>

      <!-- Development Arcs -->
      <div class="char-section">
        <div class="char-section-header">
          <h2>角色发展线</h2>
          <NButton size="small" @click="showArcForm = true">添加</NButton>
        </div>
        <div class="arc-timeline">
          <div
            v-for="(arc, idx) in arcs"
            :key="arc.id"
            class="arc-item"
          >
            <div class="arc-marker">{{ idx + 1 }}</div>
            <div class="arc-content">
              <div class="arc-story">{{ getStoryName(arc.storyId) }}</div>
              <div class="arc-summary">{{ arc.summary }}</div>
              <div class="arc-changes" v-if="arc.changes">{{ arc.changes }}</div>
            </div>
          </div>
          <div v-if="arcs.length === 0" class="empty-state" style="height: auto; padding: 20px;">
            <p style="font-size: 13px;">还没有发展线。记录这个角色在不同故事中的变化。</p>
          </div>
        </div>
      </div>

      <!-- Relations -->
      <div class="char-section">
        <div class="char-section-header">
          <h2>角色关系</h2>
          <NButton size="small" @click="showRelForm = true">添加</NButton>
        </div>
        <div class="rel-list">
          <div v-for="rel in relations" :key="rel.id" class="rel-item">
            <span class="rel-name">{{ getOtherCharName(rel) }}</span>
            <span class="rel-type">{{ rel.relationType }}</span>
            <span class="rel-desc" v-if="rel.description">— {{ rel.description }}</span>
          </div>
          <div v-if="relations.length === 0" class="empty-state" style="height: auto; padding: 20px;">
            <p style="font-size: 13px;">还没有记录任何关系。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <NModal v-model:show="showEdit" preset="dialog" title="编辑角色">
      <NSpace vertical>
        <NInput v-model:value="editForm.name" placeholder="角色名" />
        <NInput v-model:value="editForm.traits" placeholder="性格标签（逗号分隔）" />
        <NInput v-model:value="editForm.description" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" placeholder="人设描述" />
      </NSpace>
      <template #action>
        <NSpace>
          <NButton @click="showEdit = false">取消</NButton>
          <NButton type="primary" @click="onSaveEdit">保存</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Arc Form -->
    <NModal v-model:show="showArcForm" preset="dialog" title="添加发展线">
      <NSpace vertical>
        <NSelect
          v-model:value="arcForm.storyId"
          :options="storyOptions"
          placeholder="选择故事"
        />
        <NInput v-model:value="arcForm.summary" placeholder="发展概述（如：开始变得冷酷）" />
        <NInput v-model:value="arcForm.changes" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="具体变化描述" />
      </NSpace>
      <template #action>
        <NSpace>
          <NButton @click="showArcForm = false">取消</NButton>
          <NButton type="primary" @click="onSaveArc">添加</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Relation Form -->
    <NModal v-model:show="showRelForm" preset="dialog" title="添加关系">
      <NSpace vertical>
        <NSelect
          v-model:value="relForm.otherCharId"
          :options="otherCharOptions"
          placeholder="选择角色"
        />
        <NInput v-model:value="relForm.relationType" placeholder="关系类型（如：师徒, 仇人）" />
        <NInput v-model:value="relForm.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="关系描述" />
      </NSpace>
      <template #action>
        <NSpace>
          <NButton @click="showRelForm = false">取消</NButton>
          <NButton type="primary" @click="onSaveRel">添加</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NInput, NModal, NSpace, NTag, NSelect, useMessage } from 'naive-ui'
import { useCharacterStore } from '../stores/character'
import { useWorldStore } from '../stores/world'
import { useStoryStore } from '../stores/story'
import { db, type Character } from '../db/database'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const characterStore = useCharacterStore()
const worldStore = useWorldStore()
const storyStore = useStoryStore()

const charId = computed(() => route.params.characterId as string)
const char = computed(() => characterStore.characters.find((c) => c.id === charId.value))
const arcs = computed(() => characterStore.arcsOfCharacter(charId.value))
const relations = computed(() => characterStore.relationsOfCharacter(charId.value))

const showEdit = ref(false)
const showArcForm = ref(false)
const showRelForm = ref(false)

const editForm = ref({ name: '', traits: '', description: '' })
const arcForm = ref({ storyId: '', summary: '', changes: '' })
const relForm = ref({ otherCharId: '', relationType: '', description: '' })

const storyOptions = computed(() =>
  storyStore.stories.map((s) => ({ label: s.title, value: s.id }))
)

const otherCharOptions = computed(() =>
  characterStore.characters
    .filter((c) => c.id !== charId.value)
    .map((c) => ({ label: c.name, value: c.id }))
)

onMounted(async () => {
  await characterStore.loadAll()
  // Load all stories for the select options
  const allStories = await db.stories.toArray()
  storyStore.stories = allStories

  if (char.value) {
    editForm.value = {
      name: char.value.name,
      traits: char.value.traits.join(', '),
      description: char.value.description,
    }
  }
})

function getStoryName(storyId: string): string {
  const s = storyStore.stories.find((x) => x.id === storyId)
  return s?.title || '未知故事'
}

function getOtherCharName(rel: any): string {
  const otherId = rel.characterAId === charId.value ? rel.characterBId : rel.characterAId
  const c = characterStore.characters.find((x) => x.id === otherId)
  return c?.name || '未知角色'
}

async function onSaveEdit() {
  await characterStore.updateCharacter(charId.value, {
    name: editForm.value.name,
    traits: editForm.value.traits.split(',').map((t) => t.trim()).filter(Boolean),
    description: editForm.value.description,
  })
  message.success('角色已更新')
  showEdit.value = false
}

async function onSaveArc() {
  if (!arcForm.value.storyId) {
    message.warning('请选择故事')
    return
  }
  const s = storyStore.stories.find((x) => x.id === arcForm.value.storyId)
  await characterStore.createArc({
    characterId: charId.value,
    storyId: arcForm.value.storyId,
    worldId: s?.worldId || '',
    summary: arcForm.value.summary,
    changes: arcForm.value.changes,
  })
  message.success('发展线已添加')
  showArcForm.value = false
  arcForm.value = { storyId: '', summary: '', changes: '' }
}

async function onSaveRel() {
  if (!relForm.value.otherCharId) {
    message.warning('请选择角色')
    return
  }
  await characterStore.createRelation({
    characterAId: charId.value,
    characterBId: relForm.value.otherCharId,
    relationType: relForm.value.relationType,
    description: relForm.value.description,
  })
  message.success('关系已添加')
  showRelForm.value = false
  relForm.value = { otherCharId: '', relationType: '', description: '' }
}
</script>

<style scoped>
.char-detail { padding: 16px 32px; }
.detail-header { margin-bottom: 16px; }
.detail-body { display: flex; flex-direction: column; gap: 32px; }
.char-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--border-color);
}
.char-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.char-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.char-description {
  color: var(--text-secondary);
  white-space: pre-wrap;
}
.arc-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.arc-item {
  display: flex;
  gap: 12px;
}
.arc-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.arc-content { flex: 1; }
.arc-story { font-weight: 600; margin-bottom: 4px; }
.arc-summary { color: var(--text-secondary); }
.arc-changes { color: var(--text-muted); font-size: 13px; margin-top: 4px; }
.rel-list { display: flex; flex-direction: column; gap: 8px; }
.rel-item {
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
}
.rel-name { font-weight: 600; }
.rel-type { color: var(--accent-light); margin-left: 8px; }
.rel-desc { color: var(--text-muted); }
</style>
