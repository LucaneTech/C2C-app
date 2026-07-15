import { useUserProfil } from '@/hook/useUserProfil';
import { useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignOutButton from './SignoutButton';

const { width, height } = Dimensions.get('window');

export default function HeaderUserBadge() {
  const { profile, loading } = useUserProfil();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const userInitials = profile?.full_name
    ? profile.full_name.substring(0, 2).toUpperCase()
    : profile?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.headerContainer}>
        
        {/* Left Section: User Info and Role Badges */}
        <View style={styles.leftSection}>
          <View>
            <Text style={styles.welcomeText}>Bonjour 👋</Text>
            <Text style={styles.userNameText} numberOfLines={1}>
              {profile?.full_name || profile?.email?.split('@')[0] || 'Utilisateur'}
            </Text>
          </View>
          
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {profile?.role === 'seller' ? 'Vendeur' : 'Acheteur'}
            </Text>
          </View>
        </View>

        {/* Right Section: Interactive Avatar and Dropdown */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            onPress={() => setDropdownVisible(!dropdownVisible)}
            activeOpacity={0.8}
            style={[
              styles.avatarContainer,
              dropdownVisible && styles.avatarActiveBorder
            ]}
          >
            <Text style={styles.avatarText}>{userInitials}</Text>
          </TouchableOpacity>

          {dropdownVisible && (
            <>
              {/* Invisible Overlay to close dropdown and block touches on background elements */}
              <TouchableOpacity
                style={styles.globalOverlay}
                activeOpacity={1}
                onPress={() => setDropdownVisible(false)}
              />

              {/* Floating Dropdown Menu (On top of everything) */}
              <View style={styles.dropdownMenu}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownUserEmail} numberOfLines={1}>
                    {profile?.email || 'Mon profil'}
                  </Text>
                </View>
                <View style={styles.divider} />
                
                <TouchableOpacity 
                  onPress={() => setDropdownVisible(false)}
                  activeOpacity={1}
                >
                  <SignOutButton variant="solid" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffff',
    zIndex: 999, // High zIndex for the header container itself
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rightSection: {
    position: 'relative',
    zIndex: 1000, // Forces the child absolute dropdown above all siblings
  },
  welcomeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A2540',
    marginTop: 1,
    maxWidth: 150,
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  roleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0A2540',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#0A2540',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    zIndex: 1002, // Higher than the overlay to remain clickable
  },
  avatarActiveBorder: {
    borderColor: '#D4AF37',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  /* --- Fullscreen Invisible Interceptor --- */
  globalOverlay: {
    position: 'absolute',
    top: -100, // Cover safe area top offset
    right: -100,
    width: width * 1.5,
    height: height * 1.5,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  /* --- Dropdown Menu Design --- */
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 1001, // Layered on top of the overlay
    ...Platform.select({
      ios: {
        shadowColor: '#0A2540',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 24, // Maximum Android elevation to guarantee overlay order
      },
    }),
  },
  dropdownHeader: {
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  dropdownUserEmail: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
});