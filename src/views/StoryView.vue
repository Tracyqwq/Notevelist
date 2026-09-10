<template>
  <div class="story-view">
    <!-- Story Header -->
    <div class="story-header">
      <NInput
        v-model:value="storyTitle"
        size="large"
        placeholder="故事标题"
        @blur="onTitleBlur"
        :bordered="false"
        style="font-size: 20px; font-weight: 700"
      />
      <div class="story-actions">
        <NSelect
          v-model:value="storyStatus"
          :options="statusOptions"
          size="small"
          style="width: 100px"
          @update:value="onStatusChange"
        />
      </div>
    </div>

    <!-- Story Content + Fragment Panel -->
    <div class="story-body">
      <div class="story-editor-wrap">
        <div ref="editorRef" class="story-editor" />
      </div>

      <!-- Fragment Panel -->
      <div class="fragment-panel">
        <div class="fragment-panel-title">碎片列表</div>
        <NInput
          v-model:value="searchFrag"
          size="small"
          placeholder="搜索碎片..."
          clearable
        />
        <div class="fragment-panel-list">
          <div
            v-for="frag in filteredFragments"
            :key="frag.id"
            class="fragment-panel-item"
            :style="{ borderLeftColor: frag.color }"
            @click="insertFragment(frag)"
          >
            <div class="fp-item-title">{{ frag.title }}</div>
            <div class="fp-item-content">{{ frag.content.slice(0, 60) }}</div>
            <div class="fp-item-tags" v-if="frag.tags.length">
              <span v-for="t in frag.tags.slice(0,3)" :key="t" class="fp-tag">{{ t }}</span>
            </div>
          </div>
          <div v-if="filteredFragments.length === 0" class="empty-state" style="height: auto; padding: 20px;">
            <p style="font-size: 12px;">没有可用碎片</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NInput, NSelect, useMessage } from 'naive-ui'
import { useStoryStore } from '../stores/story'
import { useWorldStore } from '../stores/world'
import { useFragmentStore } from '../stores/fragment'
import { db, type Fragment } from '../db/database'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const storyStore = useStoryStore()
const worldStore = useWorldStore()
const fragmentStore = useFragmentStore()

const storyTitle = ref('')
const storyStatus = ref<'draft' | 'writing' | 'done'>('draft')
const searchFrag = ref('')
const editorRef = ref<HTMLElement>()
const storyContent = ref('')

const storyId = computed(() => route.params.storyId as string)
const story = computed(() => storyStore.stories.find((s) => s.id === storyId.value))

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '写作中', value: 'writing' },
  { label: '已完成', value: 'done' },
]

const filteredFragments = computed(() =>
  fragmentStore.fragments.filter(
    (f) =>
      f.status === 'loose' &&
      (searchFrag.value === '' ||
        f.title.includes(searchFrag.value) ||
        f.content.includes(searchFrag.value))
  )
)

async function loadStory() {
  let s = storyStore.stories.find((x) => x.id === storyId.value)
  if (!s) {
    s = await db.stories.get(storyId.value)
    if (s) storyStore.stories.push(s)
  }
  if (!s) {
    message.error('故事不存在')
    router.push('/')
    return
  }
  storyTitle.value = s.title
  storyStatus.value = s.status
  storyContent.value = s.content || ''
  worldStore.selectWorld(s.worldId)
  await fragmentStore.loadByWorld(s.worldId)
  await nextTick()
  renderEditor()
}

let editorInstance: any = null

async function renderEditor() {
  if (!editorRef.value) return

  const { Editor } = await import('@tiptap/vue-3')
  const { StarterKit } = await import('@tiptap/starter-kit')

  if (editorInstance) {
    editorInstance.destroy()
  }

  editorInstance = new Editor({
    element: editorRef.value,
    content: storyContent.value || '<p></p>',
    extensions: [StarterKit],
    onUpdate: ({ editor }) => {
      storyContent.value = editor.getHTML()
      // Debounced save
      scheduleSave()
    },
  })
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    await storyStore.updateStory(storyId.value, {
      content: storyContent.value,
    })
  }, 1000)
}

function insertFragment(frag: Fragment) {
  if (!editorInstance) return
  editorInstance.chain().focus().insertContent(
    `<div class="fragment-ref" data-fragment-id="${frag.id}">
      <blockquote style="border-left: 3px solid ${frag.color}; padding-left: 12px; margin: 1em 0;">
        <strong>碎片: ${frag.title}</strong><br>
        ${frag.content}
      </blockquote>
    </div>`
  ).run()

  fragmentStore.pasteToStory(frag.id, storyId.value)
  message.success(`碎片"${frag.title}"已贴入`)
}

async function onTitleBlur() {
  if (storyTitle.value !== story.value?.title) {
    await storyStore.updateStory(storyId.value, { title: storyTitle.value })
  }
}

async function onStatusChange(val: 'draft' | 'writing' | 'done') {
  await storyStore.updateStory(storyId.value, { status: val })
}

onMounted(loadStory)
watch(() => route.params.storyId, loadStory)
</script>

<style scoped>
.story-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.story-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  border-bottom: 1px solid var(--border-color);
}
.story-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.story-editor-wrap {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-primary);
}
.fragment-panel {
  width: 280px;
  min-width: 280px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
}
.fragment-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
}
.fragment-panel-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fragment-panel-item {
  padding: 8px 10px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border-left: 3px solid var(--border-color);
  cursor: pointer;
  transition: background 0.15s;
}
.fragment-panel-item:hover {
  background: var(--bg-hover);
}
.fp-item-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
.fp-item-content {
  font-size: 11px;
  color: var(--text-muted);
  white-space: pre-wrap;
  overflow: hidden;
  max-height: 40px;
}
.fp-item-tags {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.fp-tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--bg-hover);
  color: var(--text-muted);
}
</style>
