<template>
  <div class="world-view">
    <!-- World Header -->
    <div class="world-header">
      <div>
        <h1>{{ world?.title || '未知世界观' }}</h1>
        <p class="world-desc">{{ world?.description }}</p>
      </div>
      <div class="world-actions">
        <NButton @click="goFragmentWall">碎片墙</NButton>
        <NButton @click="goMindmap">脑图</NButton>
        <NButton type="primary" @click="showCreateStory = true">新建故事</NButton>
      </div>
    </div>

    <!-- Tabs -->
    <NTabs v-model:value="activeTab" type="segment">
      <NTabPane name="stories" tab="故事列表">
        <div class="story-list">
          <div
            v-for="story in storyStore.stories"
            :key="story.id"
            class="story-item"
            @click="goStory(story.id)"
          >
            <div class="story-item-title">{{ story.title }}</div>
            <div class="story-item-meta">
              <NTag size="small" :type="statusType(story.status)">
                {{ statusLabel(story.status) }}
              </NTag>
              <span class="story-item-date">{{ formatDate(story.updatedAt) }}</span>
            </div>
          </div>
          <div v-if="storyStore.stories.length === 0" class="empty-state">
            <p>还没有故事。点击右上角"新建故事"开始。</p>
          </div>
        </div>
      </NTabPane>

      <NTabPane name="fragments" tab="碎片列表">
        <div class="fragment-list">
          <div
            v-for="frag in fragmentStore.fragments"
            :key="frag.id"
            class="memo-card"
            :style="{ background: frag.color }"
          >
            <div class="memo-title">{{ frag.title }}</div>
            <div class="memo-content">{{ frag.content }}</div>
            <div class="memo-tags" v-if="frag.tags.length">
              <span v-for="tag in frag.tags" :key="tag" class="memo-tag">{{ tag }}</span>
            </div>
            <div class="memo-footer">
              <span>{{ frag.status === 'pasted' ? '已贴入' : '游离' }}</span>
              <span>{{ formatDate(frag.updatedAt) }}</span>
            </div>
          </div>
          <div v-if="fragmentStore.fragments.length === 0" class="empty-state">
            <p>还没有碎片。用底栏随手记一条吧。</p>
          </div>
        </div>
      </NTabPane>
    </NTabs>

    <!-- Create Story Modal -->
    <NModal v-model:show="showCreateStory" preset="dialog" title="新建故事">
      <NInput v-model:value="newStoryTitle" placeholder="故事标题" @keydown.enter="onCreateStory" />
      <template #action>
        <NSpace>
          <NButton @click="showCreateStory = false">取消</NButton>
          <NButton type="primary" @click="onCreateStory">创建</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NInput, NModal, NSpace, NTabs, NTabPane, NTag, useMessage } from 'naive-ui'
import { useWorldStore } from '../stores/world'
import { useStoryStore } from '../stores/story'
import { useFragmentStore } from '../stores/fragment'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const worldStore = useWorldStore()
const storyStore = useStoryStore()
const fragmentStore = useFragmentStore()

const activeTab = ref('stories')
const showCreateStory = ref(false)
const newStoryTitle = ref('')

const worldId = computed(() => route.params.worldId as string)
const world = computed(() => worldStore.worlds.find((w) => w.id === worldId.value))

async function loadData() {
  worldStore.selectWorld(worldId.value)
  await storyStore.loadByWorld(worldId.value)
  await fragmentStore.loadByWorld(worldId.value)
}

watch(() => route.params.worldId, loadData, { immediate: false })
onMounted(loadData)

function goStory(id: string) {
  router.push({ name: 'story', params: { storyId: id } })
}

function goFragmentWall() {
  router.push({ name: 'fragment-wall', params: { worldId: worldId.value } })
}

function goMindmap() {
  router.push({ name: 'mindmap', params: { worldId: worldId.value } })
}

async function onCreateStory() {
  if (!newStoryTitle.value.trim()) {
    message.warning('请输入故事标题')
    return
  }
  const id = await storyStore.createStory({
    worldId: worldId.value,
    title: newStoryTitle.value,
  })
  message.success('故事已创建')
  showCreateStory.value = false
  newStoryTitle.value = ''
  router.push({ name: 'story', params: { storyId: id } })
}

function statusType(status: string) {
  return status === 'done' ? 'success' : status === 'writing' ? 'warning' : 'default'
}
function statusLabel(status: string) {
  return status === 'done' ? '已完成' : status === 'writing' ? '写作中' : '草稿'
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.world-view {
  padding: 24px 32px;
}
.world-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.world-header h1 {
  font-size: 24px;
  margin-bottom: 4px;
}
.world-desc {
  color: var(--text-muted);
  font-size: 14px;
}
.world-actions {
  display: flex;
  gap: 8px;
}
.story-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.story-item {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  transition: border-color 0.2s;
}
.story-item:hover {
  border-color: var(--accent);
}
.story-item-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
.story-item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}
.story-item-date {
  font-size: 12px;
  color: var(--text-muted);
}
.fragment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.fragment-list .memo-card {
  width: 240px;
  min-height: 100px;
}
</style>
