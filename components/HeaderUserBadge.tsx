import { useUserProfil } from '@/hook/useUserProfil';
import { StyleSheet, Text, View } from 'react-native';
import SignOutButton from './SignoutButton';


export default function HeaderUserBadge() {
  const { profile, loading, session } = useUserProfil();
  
  if (loading) {
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.welcomeText}>Chargement...</Text>
      </View>
    );
  }

  // Initiales de l'utilisateur pour l'avatar
  const userInitials = profile?.full_name
    ? profile.full_name.substring(0, 2).toUpperCase()
    : profile?.email.substring(0, 2).toUpperCase() || 'U';

  return (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.welcomeText}>Bonjour!!</Text>
        <Text style={styles.userNameText}>
          {profile?.full_name || profile?.email || 'Utilisateur'}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {profile?.role === 'seller' ? 'Vendeur' : 'Acheteur'}
          </Text>
          
        </View>
        <SignOutButton/>
        
      </View>

      {/* Avatar Visuel (Arrondi strict 10px) */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{userInitials}</Text>
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  welcomeText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A2540',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    marginBottom: 10,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0A2540',
    textTransform: 'uppercase',
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: '#0A2540',
    borderRadius: 10, // Respect de la limite stricte de 10px
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});