<template>
  <div class="main-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="logo">Notevelist</span>
      </div>

      <!-- World Tree -->
      <div class="sidebar-section">
        <div class="sidebar-section-title">
          <span>世界观</span>
          <NButton size="tiny" quaternary @click="showCreateWorld = true">
            <template #icon><PlusIcon /></template>
          </NButton>
        </div>
        <NTree
          :data="worldTreeData"
          key-field="id"
          label-field="title"
          children-field="children"
          :selectable="true"
          :block-line="true"
          :expand-on-click="false"
          @node-click="onWorldClick"
        />
      </div>

      <!-- Quick Links -->
      <div class="sidebar-section sidebar-bottom">
        <NButton quaternary block @click="router.push('/characters')">
          角色库
        </NButton>
        <NButton quaternary block @click="router.push('/settings')">
          设置
        </NButton>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <RouterView />
    </main>

    <!-- Quick Fragment Input Bar -->
    <div class="quick-input-bar">
      <NInput
        v-model:value="quickFragment"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 3 }"
        placeholder="随手记一条碎片... (Enter 发送)"
        @keydown.enter.exact.prevent="onQuickFragment"
      />
      <NButton type="primary" @click="onQuickFragment" :disabled="!quickFragment.trim()">
        贴
      </NButton>
    </div>

    <!-- Create World Modal -->
    <NModal v-model:show="showCreateWorld" preset="dialog" title="创建世界观">
      <NSpace vertical>
        <NInput v-model:value="newWorldTitle" placeholder="世界观名称" />
        <NInput
          v-model:value="newWorldDesc"
          type="textarea"
          placeholder="简介（可选）"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
      </NSpace>
      <template #action>
        <NSpace>
          <NButton @click="showCreateWorld = false">取消</NButton>
          <NButton type="primary" @click="onCreateWorld">创建</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NTree, NModal, NSpace, useMessage } from 'naive-ui'
import { useWorldStore } from '../../stores/world'
import { useFragmentStore } from '../../stores/fragment'
import type { World } from '../../db/database'

const router = useRouter()
const message = useMessage()
const worldStore = useWorldStore()
const fragmentStore = useFragmentStore()

const showCreateWorld = ref(false)
const newWorldTitle = ref('')
const newWorldDesc = ref('')
const quickFragment = ref('')

const PlusIcon = h('span', { style: 'font-size: 16px' }, '+')

interface TreeNode {
  id: string
  title: string
  children?: TreeNode[]
  isLeaf?: boolean
  [key: string]: unknown
}

const worldTreeData = computed<TreeNode[]>(() => {
  function build(parentId: string | null): TreeNode[] {
    return worldStore.childrenOf(parentId).map((w) => {
      const children = build(w.id)
      return {
        id: w.id,
        title: w.title,
        children: children.length > 0 ? children : undefined,
        isLeaf: children.length === 0,
      }
    })
  }
  return build(null)
})

function onWorldClick(node: { id: string }) {
  worldStore.selectWorld(node.id)
  router.push({ name: 'world', params: { worldId: node.id } })
}

async function onCreateWorld() {
  if (!newWorldTitle.value.trim()) {
    message.warning('请输入世界观名称')
    return
  }
  await worldStore.createWorld({
    title: newWorldTitle.value,
    description: newWorldDesc.value,
  })
  message.success('世界观已创建')
  showCreateWorld.value = false
  newWorldTitle.value = ''
  newWorldDesc.value = ''
}

async function onQuickFragment() {
  const text = quickFragment.value.trim()
  if (!text) return

  const worldId = worldStore.currentWorldId
  if (!worldId) {
    message.warning('请先选择一个世界观')
    return
  }

  await fragmentStore.createFragment({
    worldId,
    content: text,
    title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
  })

  quickFragment.value = ''
  message.success('碎片已贴上')
}
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  position: relative;
}

.sidebar {
  width: 260px;
  min-width: 260px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-bottom: 60px;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}
.logo {
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-light);
}

.sidebar-section {
  padding: 12px 8px;
}
.sidebar-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px 8px;
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 80px;
}

.quick-input-bar {
  position: fixed;
  bottom: 0;
  right: 0;
  left: 260px;
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  z-index: 100;
}
</style>
