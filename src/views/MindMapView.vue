<template>
  <div class="mindmap-view">
    <div class="mindmap-header">
      <h2>关联图谱</h2>
      <NButton size="small" @click="router.back()">返回</NButton>
    </div>
    <div class="mindmap-canvas" ref="canvasRef">
      <div v-if="nodes.length === 0" class="empty-state">
        <p>还没有足够的数据生成脑图。</p>
        <p style="font-size: 12px;">创建角色和故事后，这里会展示它们之间的关联。</p>
      </div>
      <svg v-else class="mindmap-svg" :width="canvasWidth" :height="canvasHeight">
        <!-- Edges -->
        <g class="edges">
          <line
            v-for="edge in edges"
            :key="edge.id"
            :x1="edge.fromX"
            :y1="edge.fromY"
            :x2="edge.toX"
            :y2="edge.toY"
            :stroke="edge.color"
            stroke-width="2"
            :stroke-dasharray="edge.dash"
          />
          <text
            v-for="edge in edges"
            :key="'label-' + edge.id"
            :x="(edge.fromX + edge.toX) / 2"
            :y="(edge.fromY + edge.toY) / 2"
            fill="#8b949e"
            font-size="10"
            text-anchor="middle"
          >{{ edge.label }}</text>
        </g>
        <!-- Nodes -->
        <g
          v-for="node in nodes"
          :key="node.id"
          :transform="`translate(${node.x}, ${node.y})`"
          class="mindmap-node"
          @click="onNodeClick(node)"
        >
          <rect
            :x="-node.width/2"
            :y="-15"
            :width="node.width"
            :height="30"
            :rx="node.type === 'character' ? 15 : 4"
            :fill="node.color"
            stroke="#30363d"
            stroke-width="1"
          />
          <text
            text-anchor="middle"
            y="5"
            :fill="node.type === 'character' ? '#fff' : '#e6edf3'"
            font-size="12"
            font-weight="600"
          >{{ node.label }}</text>
        </g>
      </svg>
    </div>
    <div class="mindmap-legend">
      <span><span class="legend-dot" style="background:#7c3aed"></span> 角色</span>
      <span><span class="legend-dot" style="background:#3fb950"></span> 故事</span>
      <span><span class="legend-dot" style="background:#d29922"></span> 碎片</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton } from 'naive-ui'
import { useWorldStore } from '../stores/world'
import { useStoryStore } from '../stores/story'
import { useFragmentStore } from '../stores/fragment'
import { useCharacterStore } from '../stores/character'
import { db } from '../db/database'

const route = useRoute()
const router = useRouter()
const worldId = route.params.worldId as string

const worldStore = useWorldStore()
const storyStore = useStoryStore()
const fragmentStore = useFragmentStore()
const characterStore = useCharacterStore()

const canvasWidth = ref(800)
const canvasHeight = ref(600)
const canvasRef = ref<HTMLElement>()

interface MindmapNode {
  id: string
  label: string
  type: 'character' | 'story' | 'fragment'
  x: number
  y: number
  width: number
  color: string
}

interface MindmapEdge {
  id: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  label: string
  color: string
  dash: string
}

const nodes = ref<MindmapNode[]>([])
const edges = ref<MindmapEdge[]>([])

onMounted(async () => {
  worldStore.selectWorld(worldId)
  await storyStore.loadByWorld(worldId)
  await fragmentStore.loadByWorld(worldId)
  await characterStore.loadAll()

  if (canvasRef.value) {
    canvasWidth.value = canvasRef.value.clientWidth
    canvasHeight.value = canvasRef.value.clientHeight
  }

  buildMindmap()
})

function buildMindmap() {
  const nodeArr: MindmapNode[] = []
  const edgeArr: MindmapEdge[] = []
  const cx = canvasWidth.value / 2
  const cy = canvasHeight.value / 2

  // Characters in a circle at center
  const chars = characterStore.characters
  chars.forEach((c, i) => {
    const angle = (i / Math.max(chars.length, 1)) * Math.PI * 2 - Math.PI / 2
    const r = Math.min(150, 60 + chars.length * 15)
    nodeArr.push({
      id: c.id,
      label: c.name,
      type: 'character',
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      width: Math.max(80, c.name.length * 16 + 20),
      color: '#7c3aed',
    })
  })

  // Stories in outer ring
  const stories = storyStore.stories
  stories.forEach((s, i) => {
    const angle = (i / Math.max(stories.length, 1)) * Math.PI * 2
    const r = Math.min(280, 180 + stories.length * 12)
    nodeArr.push({
      id: s.id,
      label: s.title,
      type: 'story',
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      width: Math.max(80, s.title.length * 16 + 20),
      color: '#3fb950',
    })
  })

  // Character relations as edges
  characterStore.relations
    .filter((r) => r.worldId === null || r.worldId === worldId)
    .forEach((rel) => {
      const a = nodeArr.find((n) => n.id === rel.characterAId)
      const b = nodeArr.find((n) => n.id === rel.characterBId)
      if (a && b) {
        edgeArr.push({
          id: rel.id,
          fromX: a.x, fromY: a.y,
          toX: b.x, toY: b.y,
          label: rel.relationType,
          color: '#8b5cf6',
          dash: 'none',
        })
      }
    })

  // Character-Story arcs as edges
  characterStore.characterArcs
    .filter((a) => a.worldId === worldId)
    .forEach((arc) => {
      const charNode = nodeArr.find((n) => n.id === arc.characterId && n.type === 'character')
      const storyNode = nodeArr.find((n) => n.id === arc.storyId && n.type === 'story')
      if (charNode && storyNode) {
        edgeArr.push({
          id: arc.id,
          fromX: charNode.x, fromY: charNode.y,
          toX: storyNode.x, toY: storyNode.y,
          label: '参与',
          color: '#6e7681',
          dash: '4 4',
        })
      }
    })

  nodes.value = nodeArr
  edges.value = edgeArr
}

function onNodeClick(node: MindmapNode) {
  if (node.type === 'character') {
    router.push({ name: 'character-detail', params: { characterId: node.id } })
  } else if (node.type === 'story') {
    router.push({ name: 'story', params: { storyId: node.id } })
  }
}
</script>

<style scoped>
.mindmap-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.mindmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  border-bottom: 1px solid var(--border-color);
}
.mindmap-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--bg-primary);
}
.mindmap-svg {
  position: absolute;
  top: 0;
  left: 0;
}
.mindmap-node {
  cursor: pointer;
  transition: opacity 0.2s;
}
.mindmap-node:hover {
  opacity: 0.8;
}
.mindmap-legend {
  display: flex;
  gap: 16px;
  padding: 8px 32px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-muted);
}
.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 5px;
  margin-right: 4px;
  vertical-align: middle;
}
</style>
