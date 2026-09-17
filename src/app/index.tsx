import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [company, setCompany] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!company.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Xatolik', 'Barcha maydonlarni toвЂldiring.');
      return;
    }

    setLoading(true);

    try {
      // Backend ulanishini keyingi bosqichda qoвЂshamiz.
      console.log({
        company: company.trim(),
        username: username.trim(),
        password,
      });

      Alert.alert('Test', 'Login malumotlari qabul qilindi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>O</Text>
            </View>

            <Text style={styles.logoText}>OMBORCHI</Text>
            <Text style={styles.subtitle}>Ombor boshqaruv tizimi</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Kompaniya</Text>
            <TextInput
              value={company}
              onChangeText={setCompany}
              placeholder="Kompaniya nomi yoki ID"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              style={styles.input}
            />

            <Text style={styles.label}>Login</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Loginni kiriting"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={styles.label}>Parol</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Parolni kiriting"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.passwordInput}
              />

              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showButton}
              >
                <Text style={styles.showText}>
                  {showPassword ? 'Yashirish' : 'KoвЂrsatish'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.loginButtonPressed,
                loading && styles.loginButtonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>KIRISH</Text>
              )}
            </Pressable>

            <Pressable style={styles.forgotButton}>
              <Text style={styles.forgotText}>Parolni unutdingizmi?</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footer}>Powered by OMBORCHI AI</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 42,
  },

  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  logoIcon: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
  },

  logoText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#111827',
  },

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    color: '#6B7280',
  },

  form: {
    width: '100%',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
    width: '100%',
    height: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },

  passwordContainer: {
    height: 54,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },

  showButton: {
    paddingHorizontal: 14,
  },

  showText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },

  loginButton: {
    height: 56,
    marginTop: 28,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginButtonPressed: {
    opacity: 0.8,
  },

  loginButtonDisabled: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  forgotButton: {
    alignItems: 'center',
    marginTop: 20,
  },

  forgotText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },

  footer: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    paddingBottom: 18,
  },
});

