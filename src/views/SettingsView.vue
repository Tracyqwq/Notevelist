<template>
  <div class="settings-view">
    <h2>设置</h2>

    <!-- GitHub Sync -->
    <div class="settings-section">
      <h3>GitHub 同步</h3>
      <NSpace vertical>
        <NInput
          v-model:value="ghConfig.owner"
          placeholder="GitHub 用户名（如 Tracyqwq）"
        />
        <NInput
          v-model:value="ghConfig.repo"
          placeholder="仓库名（如 Notevelist）"
        />
        <NInput
          v-model:value="ghConfig.token"
          type="password"
          show-password-on="click"
          placeholder="Personal Access Token"
        />
        <NSpace>
          <NButton type="primary" :loading="syncing" @click="onPush">推送数据</NButton>
          <NButton :loading="syncing" @click="onPull">拉取数据</NButton>
          <NButton @click="onSaveConfig">保存配置</NButton>
        </NSpace>
        <NAlert v-if="syncMsg" :type="syncMsgType" :title="syncMsg" closable @close="syncMsg = ''" />
      </NSpace>
    </div>

    <!-- Import/Export -->
    <div class="settings-section">
      <h3>导入 / 导出</h3>
      <NSpace>
        <NButton @click="onExport">导出为 JSON</NButton>
        <NUpload :show-file-list="false" accept=".json" @before-upload="onImport">
          <NButton>从 JSON 导入</NButton>
        </NUpload>
      </NSpace>
    </div>

    <!-- About -->
    <div class="settings-section">
      <h3>关于</h3>
      <p class="about-text">
        <strong>Notevelist</strong> — 碎片化创作管理系统<br>
        世界观 / 角色卡 / 故事 / 碎片便签 / 关联图谱<br>
        数据存储在浏览器 IndexedDB 中，可通过 GitHub 同步。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NInput, NButton, NSpace, NUpload, NAlert, useMessage } from 'naive-ui'
import { exportAll, importAll, type ExportData } from '../db/database'

const message = useMessage()

const ghConfig = ref({ owner: '', repo: '', token: '' })
const syncing = ref(false)
const syncMsg = ref('')
const syncMsgType = ref<'success' | 'error' | 'info'>('info')

const STORAGE_KEY = 'notevelist_gh_config'

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    ghConfig.value = JSON.parse(saved)
  }
})

function onSaveConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ghConfig.value))
  message.success('配置已保存')
}

async function onPush() {
  if (!ghConfig.value.owner || !ghConfig.value.repo || !ghConfig.value.token) {
    message.warning('请先填写 GitHub 配置')
    return
  }
  syncing.value = true
  syncMsg.value = ''
  try {
    const data = await exportAll()
    const jsonStr = JSON.stringify(data, null, 2)
    const content = btoa(unescape(encodeURIComponent(jsonStr)))

    // Get current file sha if exists
    let sha: string | undefined
    try {
      const res = await fetch(
        `https://api.github.com/repos/${ghConfig.value.owner}/${ghConfig.value.repo}/contents/data/store.json`,
        { headers: { Authorization: `Bearer ${ghConfig.value.token}` } }
      )
      if (res.ok) {
        const fileData = await res.json()
        sha = fileData.sha
      }
    } catch {}

    const res = await fetch(
      `https://api.github.com/repos/${ghConfig.value.owner}/${ghConfig.value.repo}/contents/data/store.json`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${ghConfig.value.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `sync: push ${new Date().toISOString()}`,
          content,
          ...(sha ? { sha } : {}),
        }),
      }
    )

    if (res.ok) {
      syncMsg.value = '推送成功！'
      syncMsgType.value = 'success'
    } else {
      const err = await res.json()
      syncMsg.value = `推送失败: ${err.message || res.statusText}`
      syncMsgType.value = 'error'
    }
  } catch (e: any) {
    syncMsg.value = `错误: ${e.message}`
    syncMsgType.value = 'error'
  } finally {
    syncing.value = false
  }
}

async function onPull() {
  if (!ghConfig.value.owner || !ghConfig.value.repo || !ghConfig.value.token) {
    message.warning('请先填写 GitHub 配置')
    return
  }
  syncing.value = true
  syncMsg.value = ''
  try {
    const res = await fetch(
      `https://api.github.com/repos/${ghConfig.value.owner}/${ghConfig.value.repo}/contents/data/store.json`,
      { headers: { Authorization: `Bearer ${ghConfig.value.token}` } }
    )

    if (!res.ok) {
      syncMsg.value = `拉取失败: ${res.statusText}`
      syncMsgType.value = 'error'
      return
    }

    const fileData = await res.json()
    const jsonStr = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))))
    const data: ExportData = JSON.parse(jsonStr)

    await importAll(data)
    syncMsg.value = `拉取成功！导入了 ${data.worlds?.length || 0} 个世界观、${data.stories?.length || 0} 个故事。`
    syncMsgType.value = 'success'
  } catch (e: any) {
    syncMsg.value = `错误: ${e.message}`
    syncMsgType.value = 'error'
  } finally {
    syncing.value = false
  }
}

async function onExport() {
  const data = await exportAll()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notevelist-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  message.success('已导出备份')
}

async function onImport(file: { file: File }) {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data: ExportData = JSON.parse(e.target?.result as string)
      await importAll(data)
      message.success('导入成功，刷新页面以加载')
      setTimeout(() => location.reload(), 1000)
    } catch {
      message.error('导入失败：文件格式不正确')
    }
  }
  reader.readAsText(file.file)
  return false
}
</script>

<style scoped>
.settings-view { padding: 24px 32px; max-width: 700px; }
.settings-section {
  margin-top: 24px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}
.settings-section h3 { margin-bottom: 16px; }
.about-text { color: var(--text-secondary); line-height: 1.8; }
</style>
