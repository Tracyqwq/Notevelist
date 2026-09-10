<template>
  <div class="empty-state">
    <h2 style="font-size: 24px; color: var(--text-secondary)">Notevelist</h2>
    <p>碎片化创作管理系统</p>
    <p style="max-width: 400px">
      在左侧创建或选择一个世界观开始。<br>
      底栏可以随手记碎片，贴进故事里拼成完整作品。
    </p>
    <div style="display: flex; gap: 12px; margin-top: 20px;">
      <NButton @click="goCharacters">角色库</NButton>
      <NButton @click="goSettings">设置</NButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton } from 'naive-ui'

const router = useRouter()
function goCharacters() { router.push('/characters') }
function goSettings() { router.push('/settings') }
</script>
