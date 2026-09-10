<template>
  <div class="characters-view">
    <div class="chars-header">
      <h2>角色库</h2>
      <NButton type="primary" @click="showCreate = true">新建角色</NButton>
    </div>
    <div class="chars-grid">
      <div
        v-for="char in characterStore.characters"
        :key="char.id"
        class="char-card"
        @click="goDetail(char.id)"
      >
        <div class="char-avatar">
          <NAvatar round size="large" :src="char.avatar || undefined">
            {{ char.name.slice(0, 1) }}
          </NAvatar>
        </div>
        <div class="char-info">
          <div class="char-name">{{ char.name }}</div>
          <div class="char-traits">
            <NTag v-for="t in char.traits.slice(0, 3)" :key="t" size="small">{{ t }}</NTag>
          </div>
          <div class="char-desc">{{ char.description.slice(0, 50) }}</div>
          <div class="char-meta">
            {{ characterStore.arcsOfCharacter(char.id).length }} 条发展线
          </div>
        </div>
      </div>
      <div v-if="characterStore.characters.length === 0" class="empty-state">
        <p>角色库是空的。点击"新建角色"创建第一个。</p>
      </div>
    </div>

    <NModal v-model:show="showCreate" preset="dialog" title="新建角色">
      <NSpace vertical>
        <NInput v-model:value="newChar.name" placeholder="角色名" />
        <NInput
          v-model:value="newChar.traits"
          placeholder="性格标签（逗号分隔，如：勇敢, 固执）"
        />
        <NInput
          v-model:value="newChar.description"
          type="textarea"
          placeholder="人设描述"
          :autosize="{ minRows: 3, maxRows: 6 }"
        />
      </NSpace>
      <template #action>
        <NSpace>
          <NButton @click="showCreate = false">取消</NButton>
          <NButton type="primary" @click="onCreate">创建</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NModal, NSpace, NTag, NAvatar, useMessage } from 'naive-ui'
import { useCharacterStore } from '../stores/character'

const router = useRouter()
const message = useMessage()
const characterStore = useCharacterStore()

const showCreate = ref(false)
const newChar = ref({ name: '', traits: '', description: '' })

onMounted(() => {
  if (characterStore.characters.length === 0) {
    characterStore.loadAll()
  }
})

function goDetail(id: string) {
  router.push({ name: 'character-detail', params: { characterId: id } })
}

async function onCreate() {
  if (!newChar.value.name.trim()) {
    message.warning('请输入角色名')
    return
  }
  await characterStore.createCharacter({
    name: newChar.value.name,
    traits: newChar.value.traits.split(',').map((t) => t.trim()).filter(Boolean),
    description: newChar.value.description,
  })
  message.success('角色已创建')
  showCreate.value = false
  newChar.value = { name: '', traits: '', description: '' }
}
</script>

<style scoped>
.characters-view { padding: 24px 32px; }
.chars-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.chars-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.char-card {
  width: 280px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  display: flex;
  gap: 12px;
  transition: border-color 0.2s;
}
.char-card:hover { border-color: var(--accent); }
.char-info { flex: 1; }
.char-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.char-traits { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.char-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
.char-meta { font-size: 11px; color: var(--text-muted); }
</style>
