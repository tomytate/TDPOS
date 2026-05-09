import { Button, Surface, Text } from 'react-native-paper'

import { useAppTheme } from '@/constants/theme'

interface ErrorBannerProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void | Promise<void>
}

export function ErrorBanner({ title, message, actionLabel, onAction }: ErrorBannerProps) {
  const theme = useAppTheme()
  return (
    <Surface
      mode="flat"
      style={{
        padding: 12,
        backgroundColor: theme.colors.errorContainer,
        borderRadius: 8,
        gap: 4,
      }}
    >
      <Text variant="labelLarge" style={{ color: theme.colors.onErrorContainer }}>
        {title}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button
          mode="outlined"
          onPress={onAction}
          textColor={theme.colors.onErrorContainer}
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Surface>
  )
}
