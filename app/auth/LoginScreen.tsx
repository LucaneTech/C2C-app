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

export default function LoginScreen() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleSignIn,
    error,
    // handleGoogleSignIn
  } = useAuth();

  // State to toggle password visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Mock functions for social login handlers
 

  const handleFacebookSignIn = () => {
    console.log('Facebook Sign-In pressed');
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
              <Text style={styles.title}>Connexion</Text>
              <Text style={styles.subtitle}>Accédez à votre espace YABISSO</Text>
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
              <View style={styles.passwordLabelContainer}>
                <Text style={styles.label}>Mot de passe</Text>
                <Text style={styles.forgotPassword}>Oublié ?</Text>
              </View>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  onChangeText={setPassword}
                  value={password}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#52525B"
                  autoCapitalize="none"
                  style={styles.passwordInput}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIconButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#A1A1AA"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#09090B" />
              ) : (
                <Text style={styles.primaryButtonText}>SE CONNECTER</Text>
              )}
            </TouchableOpacity>

            {/* Error Message */}
            {error && (
              <Text style={styles.errorText}>
                {error}
              </Text>
            )}

            {/* Navigation link to sign up screen */}
            <Link href="/auth/SignupScreen" style={styles.linkContainer}>
              <Text style={styles.linkText}>
                Nouveau sur l'application ? <Text style={styles.linkAccent}>Créer un compte</Text>
              </Text>
            </Link>

            {/* Social Login Divider */}
            {/* <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU CONTINUER AVEC</Text>
              <View style={styles.dividerLine} />
            </View> */}

            {/* Social Buttons aligned horizontally on one line */}
            {/* <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleFacebookSignIn}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-facebook" size={18} color="#ffffff" />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View> */}

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
    minHeight: height * 0.70, // Slightly expanded height to cleanly contain all elements
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
  passwordLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPassword: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
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
  /* --- Password field container with eye button --- */
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
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    textAlign: 'center',
  },
  /* --- Social Buttons Section --- */
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 16,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12, // Space between both buttons
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8, // Space between social icon and text
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});