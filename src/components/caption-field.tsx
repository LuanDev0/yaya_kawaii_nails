/**
 * Texto curto preso a uma foto — legenda na vitrine, observação no atendimento.
 *
 * Grava por botão, e não ao sair do campo: o `TextField` espalha as props
 * recebidas depois de definir o próprio `onBlur`, então um `onBlur` vindo de
 * fora apagaria o realce de foco. O botão também é o que avisa que salvou.
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { TextField } from '@/components/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CaptionField({
  label,
  placeholder,
  value,
  disabled,
  onSave,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  disabled?: boolean;
  onSave: (text: string | null) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  // Recarregar a lista traz o texto do banco de volta. Sem isto o campo
  // continuaria mostrando o que foi digitado antes de uma gravação falhar.
  useEffect(() => {
    setText(value ?? '');
  }, [value]);

  const changed = text.trim() !== (value ?? '');

  async function save() {
    setSaving(true);

    try {
      await onSave(text.trim() || null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <TextField
        label={label}
        placeholder={placeholder}
        value={text}
        onChangeText={setText}
        editable={!disabled && !saving}
        multiline
        style={styles.input}
      />

      {/* Só aparece com algo a gravar: botão que não faz nada vira ruído. */}
      {changed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Salvar ${label.toLowerCase()}`}
          disabled={saving}
          onPress={save}
          style={({ pressed }) => [
            styles.save,
            { backgroundColor: colors.primary, opacity: saving ? 0.4 : pressed ? 0.7 : 1 },
          ]}>
          <AppText variant="label" color="onPrimary">
            {saving ? 'Salvando...' : 'Salvar'}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 64, textAlignVertical: 'top', paddingTop: Spacing.two },
  save: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    marginBottom: Spacing.two,
  },
});
