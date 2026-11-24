import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'notevelist_theme'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system')
  const systemDark = ref(false)

  const isDark = computed(
    () => mode.value === 'dark' || (mode.value === 'system' && systemDark.value)
  )

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  }

  function init() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      systemDark.value = mq.matches
      mq.addEventListener('change', (e) => {
        systemDark.value = e.matches
      })
    }
    applyTheme()
  }

  function setMode(m: ThemeMode) {
    mode.value = m
    localStorage.setItem(STORAGE_KEY, m)
  }

  watch(isDark, () => applyTheme())

  return { mode, isDark, systemDark, init, setMode }
})
