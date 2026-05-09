import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'

import { useAppTheme } from '@/constants/theme'
import { useT } from '@/i18n/translations'

type TabIconName = keyof typeof MaterialCommunityIcons.glyphMap

const iconFor = (name: TabIconName) => {
  const TabIcon = ({ color, size }: { color: string; size: number }) => (
    <MaterialCommunityIcons name={name} color={color} size={size} />
  )

  TabIcon.displayName = `TabIcon(${name})`
  return TabIcon
}

export default function TabLayout() {
  const theme = useAppTheme()
  const t = useT()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.sale'),
          tabBarIcon: iconFor('cart-outline'),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t('tabs.stock'),
          tabBarIcon: iconFor('package-variant'),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t('tabs.report'),
          tabBarIcon: iconFor('trending-up'),
        }}
      />
    </Tabs>
  )
}
