import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAuth } from '@/hook/UseAuth';

interface SignOutButtonProps {
  /**
   * Style personnalisé pour le conteneur du bouton
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Style personnalisé pour le texte du bouton
   */
  textStyle?: StyleProp<TextStyle>;
  /**
   * Variante visuelle du bouton :
   * - 'outline' : Bordure rouge, fond transparent (style Alexandria standard)
   * - 'solid' : Fond rouge uni, texte blanc
   * - 'ghost' : Pas de bordure ni de fond, uniquement du texte (idéal pour les en-têtes)
   */
  variant?: 'outline' | 'solid' | 'ghost';
  /**
   * Libellé personnalisé du bouton (par défaut "Se déconnecter")
   */
  label?: string;
}

export default function SignOutButton({
  style,
  textStyle,
  variant = 'outline',
  label = 'Se déconnecter',
}: SignOutButtonProps) {
  const { loading, handleSignOut } = useAuth();

  // Détermination des styles de conteneur selon la variante choisie
  const getButtonStyles = () => {
    switch (variant) {
      case 'solid':
        return [styles.buttonSolid, loading && styles.buttonDisabled];
      case 'ghost':
        return [styles.buttonGhost, loading && styles.buttonDisabled];
      case 'outline':
      default:
        return [styles.buttonOutline, loading && styles.buttonDisabled];
    }
  };

  // Détermination des styles de texte selon la variante choisie
  const getTextStyles = () => {
    switch (variant) {
      case 'solid':
        return styles.textSolid;
      case 'ghost':
      case 'outline':
      default:
        return styles.textOutline;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={handleSignOut}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'solid' ? '#FFFFFF' : '#EF4444'} size="small" />
      ) : (
        <Text style={[getTextStyles(), textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonOutline: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  buttonSolid: {
    width: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  textOutline: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  textSolid: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});