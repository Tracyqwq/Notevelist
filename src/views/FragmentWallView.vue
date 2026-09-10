<template>
  <div class="fragment-wall">
    <div class="wall-header">
      <h2>碎片墙</h2>
      <NButton size="small" @click="router.back()">返回</NButton>
    </div>
    <div class="wall-grid">
      <div
        v-for="frag in fragmentStore.fragments"
        :key="frag.id"
        class="memo-card wall-card"
        :style="{ background: frag.color, transform: `rotate(${randomRotate(frag.id)}deg)` }"
      >
        <div class="memo-title">{{ frag.title }}</div>
        <div class="memo-content">{{ frag.content }}</div>
        <div class="memo-tags" v-if="frag.tags.length">
          <span v-for="tag in frag.tags" :key="tag" class="memo-tag">{{ tag }}</span>
        </div>
        <div class="memo-footer">
          <span>{{ frag.status === 'pasted' ? '已贴入' : '游离' }}</span>
          <div class="memo-actions">
            <NButton size="tiny" quaternary @click.stop="editFragment(frag)">编辑</NButton>
            <NButton size="tiny" quaternary type="error" @click.stop="onDelete(frag)">删除</NButton>
          </div>
        </div>
      </div>
      <div v-if="fragmentStore.fragments.length === 0" class="empty-state">
        <p>碎片墙是空的。用底栏随手记一条碎片吧。</p>
      </div>
    </div>

    <!-- Edit Modal -->
    <NModal v-model:show="showEdit" preset="dialog" :title="editingFragment ? '编辑碎片' : '新碎片'">
      <NSpace vertical>
        <NInput v-model:value="editForm.title" placeholder="标题" />
        <NInput
          v-model:value="editForm.content"
          type="textarea"
          placeholder="内容"
          :autosize="{ minRows: 3, maxRows: 10 }"
        />
        <NInput v-model:value="editForm.tagsStr" placeholder="标签（逗号分隔）" />
      </NSpace>
      <template #action>
        <NSpace>
          <NButton @click="showEdit = false">取消</NButton>
          <NButton type="primary" @click="onSaveFragment">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NInput, NModal, NSpace, useMessage, useDialog } from 'naive-ui'
import { useFragmentStore } from '../stores/fragment'
import { useWorldStore } from '../stores/world'
import type { Fragment } from '../db/database'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const fragmentStore = useFragmentStore()
const worldStore = useWorldStore()

const worldId = route.params.worldId as string

const showEdit = ref(false)
const editingFragment = ref<Fragment | null>(null)
const editForm = ref({ title: '', content: '', tagsStr: '' })

onMounted(async () => {
  worldStore.selectWorld(worldId)
  await fragmentStore.loadByWorld(worldId)
})

function randomRotate(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return (hash % 3) - 1.5
}

function editFragment(frag: Fragment) {
  editingFragment.value = frag
  editForm.value = {
    title: frag.title,
    content: frag.content,
    tagsStr: frag.tags.join(', '),
  }
  showEdit.value = true
}

async function onSaveFragment() {
  if (!editingFragment.value) return
  await fragmentStore.updateFragment(editingFragment.value.id, {
    title: editForm.value.title,
    content: editForm.value.content,
    tags: editForm.value.tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
  })
  message.success('碎片已更新')
  showEdit.value = false
}

function onDelete(frag: Fragment) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除碎片"${frag.title}"吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await fragmentStore.deleteFragment(frag.id)
      message.success('碎片已删除')
    },
  })
}
</script>

<style scoped>
.fragment-wall {
  padding: 24px 32px;
}
.wall-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.wall-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 8px;
}
.wall-card {
  width: 220px;
  min-height: 120px;
}
.wall-card .memo-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.wall-card:hover .memo-actions {
  opacity: 1;
}
</style>
