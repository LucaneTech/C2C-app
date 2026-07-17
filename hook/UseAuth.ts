import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Required for secure browser-based OAuth flows in Expo
WebBrowser.maybeCompleteAuthSession();

export function useAuth() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Helper function to handle Supabase OAuth flow (Google, Facebook, etc.)
   * This uses a secure external browser flow to authenticate the user.
   */
  async function handleOAuthSignIn(provider: 'google' | 'facebook'): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      // Generate the redirection URI matching your app's scheme (e.g., yabisso://)
      const redirectUrl = Linking.createURL('/(tabs)');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // Crucial for Native Expo to handle the URL manually
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        return;
      }

      if (data?.url) {
        // Open the secure system web browser to complete the OAuth authentication
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        // If the user successfully completes the web flow
        if (result.type === 'success' && result.url) {
          // Parse the callback URL containing the auth tokens
          const { queryParams } = Linking.parse(result.url);
          
          if (queryParams?.access_token && queryParams?.refresh_token) {
            // Explicitly set the session within Supabase local client
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: queryParams.access_token as string,
              refresh_token: queryParams.refresh_token as string,
            });

            if (sessionError) {
              setError(sessionError.message);
              return;
            }
            
            // Redirect user to the home tab screen
            router.replace('/(tabs)');
          } else {
            // Fallback: If session handles automatically, verify session and redirect
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              router.replace('/(tabs)');
            }
          }
        }
      }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred during social login.';
      setError(errMsg);
      Alert.alert('Authentication Error', errMsg);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Signs in the user using Google OAuth provider
   */
  async function handleGoogleSignIn(): Promise<void> {
    await handleOAuthSignIn('google');
  }

  /**
   * Signs in the user using Facebook OAuth provider
   */
  async function handleFacebookSignIn(): Promise<void> {
    await handleOAuthSignIn('facebook');
  }

  /**
   * Connexion de l'utilisateur avec email et mot de passe
   */
  async function handleSignIn(): Promise<void> {
    if (!email.trim() || !password.trim()) {
      const msg = 'Veuillez remplir tous les champs.';
      setError(msg);
   
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) {
        setError(signInError.message);
        // Alert.alert('Erreur de connexion', signInError.message);
        return;
      }

      if (data?.session) {
        // Redirection uniquement en cas de succès et détruit l'historique d'auth
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Une erreur inattendue est survenue.';
      setError(errMsg);
    //   Alert.alert('Erreur', errMsg);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Inscription de l'utilisateur avec métadonnées optionnelles (ex: rôle)
   */
  async function handleSignUp(metadata?: Record<string, any>): Promise<void> {
    const redirectTo = Linking.createURL('/auth/LoginScreen'); // Redirection après confirmation email
    if (!email.trim() || !password.trim()) {
      const msg = 'Veuillez remplir tous les champs.';
      setError(msg);
      
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
        error: signUpError,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,

        options: {
          emailRedirectTo: redirectTo,
          data: metadata || {},
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        
        return;
      }

      if (session) {
        // Si la confirmation d'email est désactivée dans Supabase,
        // la session démarre directement : on redirige vers l'application.
        router.replace('/(tabs)');
      } else {
        // Si la confirmation d'email est activée, l'utilisateur n'a pas de session
        // active immédiate : on l'invite à confirmer sans le rediriger.
        Alert.alert(
          'Inscription réussie',
          'Veuillez vérifier votre boîte de réception pour valider votre adresse email.'
        );
      }
    } catch (err: any) {
      const errMsg = err.message || "Une erreur est survenue lors de l'inscription.";
      setError(errMsg);
      Alert.alert('Erreur', errMsg);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Déconnexion de l'utilisateur
   */
  async function handleSignOut(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        Alert.alert('Erreur de déconnexion', signOutError.message);
        return;
      }
      
      // Redirection vers l'écran de connexion après déconnexion
      router.replace('/auth/LoginScreen');
    } catch (err: any) {
      const errMsg = err.message || 'Une erreur est survenue lors de la déconnexion.';
      setError(errMsg);
      Alert.alert('Erreur', errMsg);
    } finally {
      setLoading(false);
    }
  }




 ///**************Reset and updatepassword functions */

/**
 * Envoie un email de réinitialisation contenant un lien profond (Deep Link)
 */
async function handleRequestPasswordReset(emailInput: string): Promise<boolean> {
  setLoading(true);
  setError(null);
  try {
    // Génère l'URL de redirection propre à l'application
    const redirectUrl = Linking.createURL('/auth/ResetPasswordScreen');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      emailInput.trim(),
      { redirectTo: redirectUrl }
    );

    if (resetError) {
      setError(resetError.message);
      return false;
    }

    Alert.alert(
      'Email envoyé',
      'Un lien de réinitialisation de mot de passe a été envoyé à votre adresse email.'
    );
    return true;
  } catch (err: any) {
    const errMsg = err.message || 'Une erreur est survenue.';
    setError(errMsg);
    return false;
  } finally {
    setLoading(false);
  }
}

/**
 * Met à jour le mot de passe de l'utilisateur actuellement authentifié (session temporaire de récupération)
 */
async function handleUpdatePassword(newPassword: string): Promise<boolean> {
  setLoading(true);
  setError(null);
  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    Alert.alert('Succès', 'Votre mot de passe a été modifié avec succès.');
    router.replace('/auth/LoginScreen');
    return true;
  } catch (err: any) {
    const errMsg = err.message || 'Impossible de mettre à jour le mot de passe.';
    setError(errMsg);
    return false;
  } finally {
    setLoading(false);
  }
}
  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
//email and password handlers
    handleSignIn,
    handleSignUp,
    handleSignOut,

//social login handlers
    handleGoogleSignIn,  
    handleFacebookSignIn, 

//Reset and update password handlers
    handleRequestPasswordReset,  
    handleUpdatePassword,
  };
}