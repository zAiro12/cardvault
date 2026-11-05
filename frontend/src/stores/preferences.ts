import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

type Theme = 'light' | 'dark'

export const usePreferencesStore = defineStore('preferences', () => {
  const theme = ref<Theme>((localStorage.getItem('cardvault-theme') as Theme) || 'dark')
  watch(theme, (value) => {
    document.documentElement.dataset.theme = value
    localStorage.setItem('cardvault-theme', value)
  }, { immediate: true })
  function toggleTheme() { theme.value = theme.value === 'dark' ? 'light' : 'dark' }
  return { theme, toggleTheme }
})