import pb from '@/lib/pocketbase/client'
import type { NotificationPreferences, NotificationJob } from '@/types/health'

export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  'id' | 'user' | 'created' | 'updated'
> = {
  enabled: true,
  appointments_enabled: true,
  exams_enabled: true,
  days_advance: 2,
  notify_day_before: true,
  notify_same_day: true,
  family_opt_in: true,
}

export async function getUserNotificationPreferences(): Promise<NotificationPreferences | null> {
  const user = pb.authStore.model
  if (!user) return null

  try {
    const list = await pb
      .collection('notification_preferences')
      .getList<NotificationPreferences>(1, 1, {
        filter: `user = "${user.id}"`,
      })
    if (list.items.length > 0) {
      return list.items[0]
    }

    // Criar se não existir ainda
    const created = await pb
      .collection('notification_preferences')
      .create<NotificationPreferences>({
        user: user.id,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
      })
    return created
  } catch (err) {
    console.warn('Erro ao obter preferências de notificação:', err)
    return null
  }
}

export async function updateUserNotificationPreferences(
  prefsId: string,
  data: Partial<Omit<NotificationPreferences, 'id' | 'user' | 'created' | 'updated'>>,
): Promise<NotificationPreferences> {
  return pb.collection('notification_preferences').update<NotificationPreferences>(prefsId, data)
}

export async function getNotificationJobs(limit = 20): Promise<NotificationJob[]> {
  try {
    const res = await pb.collection('notification_jobs').getList<NotificationJob>(1, limit, {
      sort: '-created',
    })
    return res.items
  } catch (err) {
    console.warn('Erro ao carregar histórico de notificações:', err)
    return []
  }
}

export async function triggerProcessReminders(simulate = false): Promise<any> {
  const query = simulate ? '?simulate=true' : ''
  return pb.send(`/backend/v1/sevisaude/process-reminders${query}`, {
    method: 'POST',
  })
}
