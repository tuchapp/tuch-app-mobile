/**
 * DatePickerField -- A pressable field that opens the native date picker.
 *
 * Props:
 *   label:        string
 *   value:        string (YYYY-MM-DD format or empty)
 *   onChange:     (dateString: string) => void
 *   placeholder?: string
 *   minimumDate?: Date
 */
import { useState } from "react";
import { View, Text, Pressable, Platform, Modal, StyleSheet } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (dateString: string) => void;
  placeholder?: string;
  minimumDate?: Date;
}

/** Parse "YYYY-MM-DD" into a local Date (avoids timezone shift). */
function parseLocalDate(iso: string): Date | null {
  const parts = iso.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Format a Date as "YYYY-MM-DD" using local values. */
function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format a Date as a user-friendly display string, e.g. "Apr 5, 2026". */
function formatDisplay(date: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Select a date",
  minimumDate,
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const currentDate = parseLocalDate(value) ?? new Date();
  const hasValue = !!value && !!parseLocalDate(value);

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (event.type === "set" && selectedDate) {
      onChange(formatYMD(selectedDate));
      if (Platform.OS === "ios") {
        // keep picker open on iOS until dismissed
      }
    }
    if (event.type === "dismissed") {
      setShowPicker(false);
    }
  }

  function handleIOSConfirm() {
    setShowPicker(false);
  }

  return (
    <View>
      <Pressable
        style={[s.field, hasValue && s.fieldSelected]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={hasValue ? s.fieldText : s.fieldPlaceholder}>
          {hasValue ? formatDisplay(currentDate) : placeholder}
        </Text>
      </Pressable>

      {/* Android: the picker renders as a native modal dialog automatically */}
      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
        />
      )}

      {/* iOS: show picker inline inside a bottom modal */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable style={s.modalOverlay} onPress={() => setShowPicker(false)}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{label}</Text>
                <Pressable onPress={handleIOSConfirm}>
                  <Text style={s.modalDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                style={{ width: "100%" }}
              />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  fieldSelected: {
    borderColor: "#7e22ce",
  },
  fieldText: {
    fontSize: 16,
    color: "#111",
  },
  fieldPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  modalDone: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7e22ce",
  },
});
