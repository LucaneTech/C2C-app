import { useAuth } from '@/hook/UseAuth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const { handleUpdatePassword, loading, error } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hidePassword, setHidePassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (newPassword.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLocalError(null);
    await handleUpdatePassword(newPassword);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexContainer}
      >
        <SafeAreaView style={styles.content}>
          <View style={styles.formCard}>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>
              Choisissez un mot de passe sécurisé pour protéger votre compte.
            </Text>

            {/* Nouveau Mot de Passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nouveau mot de passe</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={hidePassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimum 6 caractères"
                  placeholderTextColor="#52525B"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setHidePassword(!hidePassword)}
                >
                  <Ionicons
                    name={hidePassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#A1A1AA"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirmation */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={hideConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Répétez votre mot de passe"
                  placeholderTextColor="#52525B"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setHideConfirmPassword(!hideConfirmPassword)}
                >
                  <Ionicons
                    name={hideConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#A1A1AA"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Affichage des erreurs */}
            {(error || localError) && (
              <Text style={styles.errorText}>{error || localError}</Text>
            )}

            {/* Bouton de soumission */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#09090B" />
              ) : (
                <Text style={styles.submitButtonText}>METTRE À JOUR</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flexContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  formCard: {
    backgroundColor: '#0a2540',
    borderRadius: 5,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#A1A1AA',
    lineHeight: 18,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E4E4E7',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    height: 52,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    height: '100%',
    fontSize: 14,
    color: '#FFFFFF',
  },
  eyeIcon: {
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#09090B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
});