import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 全局错误提示 store
 *
 * 所有 store 的写操作在失败时调用 reportError，把错误信息暴露出来，
 * 由 MainLayout 监听 errorId 变化并弹出 message.error。
 * 这样避免了"静默失败"——用户能立刻看到操作失败的原因。
 */
export const useErrorStore = defineStore('error', () => {
  const lastError = ref('')
  const errorId = ref(0)

  function reportError(message: string, err?: unknown) {
    const detail =
      err instanceof Error
        ? err.message
        : err !== undefined && err !== null
          ? String(err)
          : ''
    lastError.value = detail ? `${message}：${detail}` : message
    errorId.value++
  }

  return { lastError, errorId, reportError }
})
