
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Pressable } from 'react-native';
import { loginUsuario } from '../../shared/api';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';


export default function LoginScreen({ onLogin, onShowRegister, onShowForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      Alert.alert('Error', 'Ingrese su correo');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/usuarios/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Listo', 'Se envió un código a tu correo');
        setShowForgot(false);
        setForgotEmail('');
      } else {
        Alert.alert('Error', data.message || 'No se pudo enviar el correo');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo conectar al servidor');
    } finally {
      setForgotLoading(false);
    }
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '351324441687-39sdmfov119bqa28d703aqodo181jpih.apps.googleusercontent.com', // Este es el client ID de tipo Web
    });
  }, []);
  const handleGoogleLogin = async () => {
    try {
      console.log('GoogleSignin.hasPlayServices...');
      await GoogleSignin.hasPlayServices();
      console.log('GoogleSignin.signIn...');
      const userInfo = await GoogleSignin.signIn();
      console.log('userInfo:', userInfo);
      const credential = userInfo.idToken;
      if (!credential) throw new Error('No se obtuvo token de Google');
      // Llama al backend igual que en web
      console.log('Enviando token al backend...');
      const res = await fetch('http://localhost:3001/api/usuarios/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      console.log('Respuesta backend:', data);
      if (res.ok && data.token) {
        onLogin(data.token);
      } else {
        Alert.alert('Error', data.message || 'No se pudo autenticar con Google');
      }
    } catch (error) {
      console.log('Error en Google Sign-In:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // usuario canceló
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Espera', 'Ya hay un proceso de login en curso');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services no disponible');
      } else {
        Alert.alert('Error', error.message || 'Error al autenticar con Google');
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingrese usuario y contraseña');
      return;
    }
    setLoading(true);
    try {
      const data = await loginUsuario(email, password);
      if (data.token) {
        onLogin(data.token);
      } else {
        Alert.alert('Error', data.message || 'Credenciales incorrectas');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
        <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', marginTop: 24 }}>
        <Pressable onPress={onShowForgot} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}> 
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
        <Text style={{ marginHorizontal: 8 }}>|</Text>
        <Pressable onPress={onShowRegister} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}> 
          <Text style={styles.link}>Registrarse</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  link: {
    color: '#6c4fa1',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelButton: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  cancelButtonText: {
    color: '#6c4fa1',
    fontWeight: 'bold',
    fontSize: 16,
  },
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#6c4fa1',
  },
  input: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#6c4fa1',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderColor: '#6c4fa1',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  googleButtonText: {
    color: '#6c4fa1',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
