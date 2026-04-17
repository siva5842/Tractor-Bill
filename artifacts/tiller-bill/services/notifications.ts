import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function scheduleDebtReminder(params: {
  debtId: string;
  contactName: string;
  amount: number;
  date: Date;
  title: string;
  body: string;
}): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;
    if (params.date <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: { debtId: params.debtId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: params.date,
      },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}
