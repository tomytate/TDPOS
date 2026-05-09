import { createMMKV } from 'react-native-mmkv'
import type { StateStorage } from 'zustand/middleware'

export const storage = createMMKV()

export const mmkvStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
}
