import * as Notifications from "expo-notifications";
import notifee, { AndroidImportance, AndroidVisibility } from "@notifee/react-native";
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

    // Use Notifee for consistency and better Android support
    const channelId = await notifee.createChannel({
      id: "reminders",
      name: "Reminders",
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
    });

    const id = await notifee.createTriggerNotification(
      {
        title: params.title,
        body: params.body,
        data: { debtId: params.debtId },
        android: {
          channelId,
          pressAction: {
            id: "default",
          },
        },
      },
      {
        type: 0, // Timestamp trigger
        timestamp: params.date.getTime(),
      }
    );
    return id;
  } catch (err) {
    console.error("Schedule error:", err);
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await notifee.cancelNotification(notificationId);
  } catch {}
}
