import { Image } from 'expo-image'
import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { ink } from '@/constants/colors'
import {
  PRODUCT_IMAGE_BLURHASH,
  PRODUCT_IMAGE_CACHE_POLICY,
  PRODUCT_IMAGE_TRANSITION_MS,
  getProductFallbackColor,
  getProductImageSource,
  getProductInitials,
} from './product-glyph-model'

interface ProductGlyphProps {
  name: string
  categoryId: string | null
  imageUri?: string | null
  size?: number
}

export function ProductGlyph({ name, categoryId, imageUri, size = 44 }: ProductGlyphProps) {
  const imageSource = getProductImageSource(imageUri)
  const radius = 12

  if (imageSource) {
    return (
      <Image
        source={imageSource}
        placeholder={{ blurhash: PRODUCT_IMAGE_BLURHASH }}
        cachePolicy={PRODUCT_IMAGE_CACHE_POLICY}
        contentFit="cover"
        transition={PRODUCT_IMAGE_TRANSITION_MS}
        recyclingKey={imageSource.uri}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: ink[100] }}
        accessible={false}
      />
    )
  }

  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: getProductFallbackColor(categoryId ?? name),
      }}
    >
      <Text variant="labelLarge" style={{ color: ink[800], fontWeight: '700' }}>
        {getProductInitials(name)}
      </Text>
    </View>
  )
}
