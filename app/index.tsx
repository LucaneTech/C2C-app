import { useRouter } from 'expo-router';
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function GetStartedScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/auth/LoginScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFBFB" />

      {/* 1. HEADER ÉPURÉ */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoLetter}>Y</Text>
        </View>
        <Text style={styles.brandName}>YABISSO</Text>
      </View>

      {/* 2. COMPOSITION VISUELLE ABSTRAITE ET ASYMÉTRIQUE (Position absolue intense) */}
      <View style={styles.visualContainer}>
        {/* Disques de lumière diffuse en arrière-plan */}
        <View style={[styles.ambientGlow, styles.glowGold]} />
        <View style={[styles.ambientGlow, styles.glowBlue]} />

        <View style={styles.geometricFrame}>
          {/* Lignes de fuite géométriques d'arrière-plan */}
          <View style={styles.vectorGridLine1} />
          <View style={styles.vectorGridLine2} />

          {/* Élément Flottant Principal : La carte de transaction abstraite */}
          <View style={styles.floatingCard}>
            <View style={styles.cardChip} />
            <View style={styles.cardLineLong} />
            <View style={styles.cardLineShort} />

            {/* Badge de prix flottant en position absolue */}
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>15.00 MAD</Text>
            </View>
          </View>

          {/* Élément Flottant Secondaire : Badge d'échange sécurisé */}
          <View style={styles.securityIndicator}>
            <View style={styles.securityPulse} />
            <Text style={styles.securityText}>Ventes & Achats</Text>
          </View>
        </View>
      </View>

      {/* 3. SECTION TEXTE ET ACTION */}
      <View style={styles.footer}>
        <Text style={styles.eyebrow}>EXCLUSIF AUX ÉTRANGERS</Text>
        <Text style={styles.title}>Le commerce local,{"\n"}simplifié.</Text>
        <Text style={styles.subtitle}>
          Achetez, vendez et échangez en toute sécurité au sein de votre communauté universitaire.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>COMMENCER</Text>

        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    gap: 12,
  },
  logoBadge: {
    width: 34,
    height: 34,
    backgroundColor: '#09090B',
    borderRadius: 8, // Design tranchant et géométrique strict
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    color: '#D4AF37', // Touche d'or premium
    fontWeight: '900',
    fontSize: 20,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#09090B',
    letterSpacing: 2,
  },

  /* --- COMPOSITION VISUELLE AVANCÉE --- */
  visualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: "100%",
    opacity: 0.2,
  },
  glowGold: {
    backgroundColor: '#D4AF37',
    top: '5%',
    left: '-10%',
  },
  glowBlue: {
    backgroundColor: '#3B82F6',
    bottom: '5%',
    right: '-10%',
  },
  geometricFrame: {
    width: '100%',
    height: 260,
    backgroundColor: '#18181B',
    borderRadius: 8, // Rayon strict maximum de 8px
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  vectorGridLine1: {
    position: 'absolute',
    top: -50,
    left: '30%',
    width: 1,
    height: '150%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ rotate: '35deg' }],
  },
  vectorGridLine2: {
    position: 'absolute',
    top: -50,
    left: '60%',
    width: 1,
    height: '150%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    transform: [{ rotate: '35deg' }],
  },
  floatingCard: {
    width: 190,
    height: 115,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 8, // Match de 8px
    padding: 16,
    position: 'relative',
    transform: [{ rotate: '-10deg' }, { translateX: -20 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cardChip: {
    width: 24,
    height: 18,
    backgroundColor: '#D4AF37',
    borderRadius: 3,
    opacity: 0.8,
    marginBottom: 20,
  },
  cardLineLong: {
    height: 3,
    width: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1.5,
    marginBottom: 6,
  },
  cardLineShort: {
    height: 3,
    width: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
  },
  priceBadge: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    backgroundColor: '#09090B',
    borderColor: '#D4AF37',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8, // Match de 8px
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  priceText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  securityIndicator: {
    position: 'absolute',
    top: 30,
    right: 25,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8, // Match de 8px
  },
  securityPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  securityText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* --- ZONE TEXTE & ACTIONS --- */
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 44,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D4AF37',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: "center"
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#09090B',
    lineHeight: 38,
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 15,
    color: '#71717A',
    lineHeight: 22,
    marginBottom: 36,
    fontWeight: '300',
    textAlign: "center"
  },
  primaryButton: {
    backgroundColor: '#09090B',
    borderRadius: 5,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#09090B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: "center"
  },

});