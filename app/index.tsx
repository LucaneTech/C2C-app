import 'react-native-url-polyfill/auto'
import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import supabase  from './lib/supabase'
import Auth from '../components/Auth'
import { Session } from '@supabase/supabase-js'
import { router } from 'expo-router'

// Importe ton outil de navigation ici, exemple avec Expo Router :
// import { useRouter } from 'expo-router'
// Ou avec React Navigation :
// import { useNavigation } from '@react-navigation/native'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  // const router = useRouter() // Si tu utilises Expo Router

  useEffect(() => {
    // 1. Récupère la session actuelle au montage du composant
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        // Rediriger ici si l'utilisateur est déjà connecté au lancement
        router.replace('/(tabs)')
      }
    })

    // 2. Écoute les changements d'état (connexion, déconnexion, inscription)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession)

      if (event === 'SIGNED_IN' && currentSession) {
        // Redirection dès que l'utilisateur se connecte ou valide son inscription
        router.replace('/(tabs)')
      } else if (event === 'SIGNED_OUT') {
        // Redirection vers l'écran de connexion si l'utilisateur se déconnecte
        router.replace('/')
      }
    })

    // 3. Nettoyage de l'abonnement quand le composant est démonté (évite les fuites de mémoire)
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      {!session ? (
        <Auth />
      ) : (
        <View>
          <Text>Bienvenue ! ID Utilisateur : {session.user.id}</Text>
        </View>
      )}
    </View>
  )
}