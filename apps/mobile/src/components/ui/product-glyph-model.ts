import { categoryBg } from '@/constants/colors'

export const PRODUCT_IMAGE_CACHE_POLICY = 'memory-disk' as const
export const PRODUCT_IMAGE_TRANSITION_MS = 120
export const PRODUCT_IMAGE_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'

const fallbackColors = Object.values(categoryBg)

export function getProductImageSource(imageUri: string | null | undefined): { uri: string } | null {
  const uri = imageUri?.trim()
  return uri ? { uri } : null
}

export function getProductFallbackColor(seed: string | null | undefined): string {
  if (!seed) return categoryBg.sachet

  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return fallbackColors[hash % fallbackColors.length] ?? categoryBg.sachet
}

export function getProductInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 'TD'
  if (words.length === 1) return words[0]?.slice(0, 2).toUpperCase() ?? 'TD'

  return `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toUpperCase()
}
