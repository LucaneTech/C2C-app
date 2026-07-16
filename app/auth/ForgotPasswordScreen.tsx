import { useAuth } from '@/hook/UseAuth';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

const { height } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const { handleRequestPasswordReset, loading, error } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!emailInput.trim()) {
      setLocalError('Veuillez entrer votre adresse email.');
      return;
    }
    
    setLocalError(null);
    await handleRequestPasswordReset(emailInput.trim());
  };

  return (
    <View style={styles.outerContainer}>
      {/* Background decorative glow */}
      <View style={styles.ambientGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Area with Back Button */}
          <SafeAreaView style={styles.headerContainer}>
            <Link href="/auth/LoginScreen" asChild>
              <TouchableOpacity style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color="#0a2540" />
              </TouchableOpacity>
            </Link>
            <View style={styles.logoIconBadge}>
              <Ionicons name="mail-open-outline" size={28} color="#0a2540" />
            </View>
            <Text style={styles.logoText}>YABISSO</Text>
          </SafeAreaView>

          {/* Main Dark Form Card */}
          <View style={styles.formCard}>
            {/* Form Header */}
            <View style={styles.formHeader}>
              <Text style={styles.title}>Mot de passe oublié</Text>
              <Text style={styles.subtitle}>
                Entrez votre email pour recevoir un lien de réinitialisation.
              </Text>
            </View>

            {/* Email Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse Email</Text>
              <TextInput
                onChangeText={setEmailInput}
                value={emailInput}
                placeholder="votre.email@domaine.com"
                placeholderTextColor="#52525B"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={!loading}
              />
            </View>

            {/* Error Message */}
            {(error || localError) && (
              <Text style={styles.errorText}>
                {error || localError}
              </Text>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#09090B" />
              ) : (
                <Text style={styles.primaryButtonText}>ENVOYER LE LIEN</Text>
              )}
            </TouchableOpacity>

            {/* Back to Login Link */}
            <Link href="/auth/LoginScreen" style={styles.linkContainer}>
              <Text style={styles.linkText}>
                Retourner à la <Text style={styles.linkAccent}>connexion</Text>
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FAFBFB',
  },
  ambientGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#0a2540',
    opacity: 0.15,
  },
  flexContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: height,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    zIndex: 10,
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 24,
    top: Platform.OS === 'ios' ? 0 : 12,
    padding: 8,
  },
  logoIconBadge: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 1.5,
  },
  formCard: {
    width: '100%',
    backgroundColor: '#0a2540',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: Platform.OS === 'ios' ? 45 : 30,
    flexGrow: 1,
    minHeight: height * 0.65,
  },
  formHeader: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#A1A1AA',
    marginTop: 8,
    fontWeight: '300',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E4E4E7',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#09090B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  linkContainer: {
    marginTop: 24,
    alignSelf: 'center',
  },
  linkText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '300',
  },
  linkAccent: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
});