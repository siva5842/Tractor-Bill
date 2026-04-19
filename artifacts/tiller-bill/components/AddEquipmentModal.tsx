import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useData } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  onClose: () => void;
  editEquipment?: Equipment;
}

export function AddEquipmentModal({ visible, onClose, editEquipment }: Props) {
  const { t } = useApp();
  const colors = useColors();
  const { addEquipment, updateEquipment } = useData();

  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible && editEquipment) {
      setName(editEquipment.name);
      setRate(editEquipment.hourlyRate.toString());
      setPhotoUri(editEquipment.photoUri || null);
    }
  }, [visible, editEquipment]);

  const pickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("galleryPermission"), t("galleryPermissionDenied"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Image picker error:", e);
    }
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("cameraPermission"), t("cameraPermissionDenied"));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Camera error:", e);
    }
  };

  const showImagePicker = () => {
    Alert.alert(t("addPhoto"), "", [
      { text: t("camera"), onPress: pickFromCamera },
      { text: t("gallery"), onPress: pickFromGallery },
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t("missingField"), t("enterEquipmentName"));
      return;
    }
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum <= 0) {
      Alert.alert(t("missingField"), t("enterValidRate"));
      return;
    }
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (editEquipment) {
      updateEquipment(editEquipment.id, {
        name: name.trim(),
        hourlyRate: rateNum,
        photoUri: photoUri || undefined,
      });
    } else {
      addEquipment({
        name: name.trim(),
        hourlyRate: rateNum,
        photoUri: photoUri || undefined,
      });
    }
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setRate("");
    setPhotoUri(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {editEquipment ? t("edit") || "Edit Equipment" : t("addEquipment")}
            </Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <MaterialIcons
                name="close"
                size={26}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              style={[
                styles.photoBox,
                {
                  borderColor: photoUri ? colors.primary : colors.border,
                  backgroundColor: colors.secondary,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={showImagePicker}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <>
                  <MaterialIcons
                    name="add-a-photo"
                    size={40}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.photoText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {t("addPhoto")}
                  </Text>
                </>
              )}
            </Pressable>

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("equipmentName")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.background,
                  borderRadius: colors.radius,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t("equipmentName")}
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
            />

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("hourlyRate")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.background,
                  borderRadius: colors.radius,
                },
              ]}
              value={rate}
              onChangeText={setRate}
              placeholder={t("ratePlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            <Pressable
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={handleSave}
            >
              <Text
                style={[
                  styles.saveBtnText,
                  { color: colors.primaryForeground },
                ]}
              >
                {t("save")}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  photoBox: {
    height: 140,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    marginBottom: 16,
  },
  saveBtn: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
