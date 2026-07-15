import { useAuth } from '@/hook/UseAuth';
import Ionicons from '@expo/vector-icons/Ionicons';
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

const { height } = Dimensions.get('window');

type UserRole = 'customer' | 'seller';

export default function SignupScreen() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleSignUp,
    error,
  } = useAuth();

  const [role, setRole] = useState<UserRole>('customer');
  const [phone, setPhone] = useState<string>('');

  // State for confirm password field to avoid mirror typing
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Independent states to show/hide passwords
  const [hidePassword, setHidePassword] = useState<boolean>(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState<boolean>(true);
  const [passError, setPassError] = useState<string | null>(null);

  const onRegisterPress = () => {
    if (password !== confirmPassword) {
      setPassError('Les deux mots de passe ne correspondent pas!!');
      return;
    }
    setPassError(null);
    handleSignUp({ role: role, phone: phone, full_name: "Francisco" });
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
          {/* Header Logo Area */}
          <SafeAreaView style={styles.logoContainer}>
            <View style={styles.logoIconBadge}>
              <Ionicons name="storefront" size={28} color="#0a2540" />
            </View>
            <Text style={styles.logoText}>YABISSO</Text>
          </SafeAreaView>

          {/* Main Dark Form Card */}
          <View style={styles.formCard}>
            {/* Form Header */}
            <View style={styles.formHeader}>
              <Text style={styles.title}>Créer un compte</Text>
              <Text style={styles.subtitle}>Rejoignez notre plateforme locale</Text>
            </View>

            {/* Visual Role Selector (Buyer / Seller) */}
            <View style={styles.roleContainer}>
              <Text style={styles.label}>Type de compte</Text>
              <View style={styles.selectorWrapper}>
                <TouchableOpacity
                  style={[
                    styles.selectorOption,
                    role === 'customer' && styles.selectorOptionActive,
                  ]}
                  onPress={() => !loading && setRole('customer')}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      role === 'customer' && styles.selectorTextActive,
                    ]}
                  >
                    Acheteur
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.selectorOption,
                    role === 'seller' && styles.selectorOptionActive,
                  ]}
                  onPress={() => !loading && setRole('seller')}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      role === 'seller' && styles.selectorTextActive,
                    ]}
                  >
                    Vendeur
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Phone Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Numéro de téléphone *</Text>
              <TextInput
                onChangeText={setPhone}
                value={phone}
                placeholder="+212 600 00 00 00"
                placeholderTextColor="#52525B"
                autoCapitalize="none"
                keyboardType="phone-pad"
                style={styles.input}
                editable={!loading}
              />
            </View>

            {/* Email Input Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse Email</Text>
              <TextInput
                onChangeText={setEmail}
                value={email}
                placeholder="votre.email@domaine.com"
                placeholderTextColor="#52525B"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={!loading}
              />
            </View>

            {/* Password Input Field with Toggle Visibility */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  onChangeText={setPassword}
                  value={password}
                  secureTextEntry={hidePassword}
                  placeholder="Créez un mot de passe"
                  placeholderTextColor="#52525B"
                  autoCapitalize="none"
                  style={styles.passwordInput}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIconButton}
                  onPress={() => setHidePassword(!hidePassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={hidePassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#A1A1AA"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input Field with Toggle Visibility */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmer le mot de passe</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  onChangeText={setConfirmPassword}
                  value={confirmPassword}
                  secureTextEntry={hideConfirmPassword}
                  placeholder="Confirmez votre mot de passe"
                  placeholderTextColor="#52525B"
                  autoCapitalize="none"
                  style={styles.passwordInput}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIconButton}
                  onPress={() => setHideConfirmPassword(!hideConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={hideConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#A1A1AA"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={onRegisterPress}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#09090B" />
              ) : (
                <Text style={styles.primaryButtonText}>S'INSCRIRE</Text>
              )}
            </TouchableOpacity>

            {/* Error Messages (Password Mismatch or API Errors) */}
            {(error || passError) && (
              <Text style={styles.errorText}>
                {error || passError}
              </Text>
            )}
            <Link href="/auth/SignupScreen" style={styles.linkContainer}>
              <Text style={styles.linkText}>
                Vous avez déjà un compte ? <Text style={styles.linkAccent}>Connectez-vous</Text>
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
  /* --- Logo Styling --- */
  logoContainer: {
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 20,
    zIndex: 10,
  },
  logoIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0a2540',
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
    color: '#0a2540',
    letterSpacing: 1.5,
  },
  /* --- Dark Form Card Styling --- */
  formCard: {
    width: '100%',
    backgroundColor: '#0a2540',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: Platform.OS === 'ios' ? 45 : 30,
    flexGrow: 1,
    minHeight: height * 0.70, // Matches login form card height
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
    marginTop: 4,
    fontWeight: '300',
  },
  /* --- Role Selector Styling --- */
  roleContainer: {
    marginBottom: 20,
  },
  selectorWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  selectorOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  selectorOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A1A1AA',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectorTextActive: {
    color: '#09090B',
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
  /* --- Password Input styling --- */
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    height: 52,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    height: '100%',
    fontSize: 14,
    color: '#FFFFFF',
  },
  eyeIconButton: {
    height: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 16,
    textAlign: 'center',
  },
   linkContainer: {
    marginTop: 20,
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
});