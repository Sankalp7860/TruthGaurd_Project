import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Linking,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, Shield, LogOut, ChevronRight, MessageSquare, X, Copy } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubject, setFeedbackSubject] = useState('');

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const handleSendFeedback = async () => {
    if (!feedbackSubject.trim() || !feedbackText.trim()) {
      Alert.alert('Error', 'Please fill in both subject and feedback message.');
      return;
    }

    const emailBody = `From: ${user?.email}\n\nFeedback:\n${feedbackText}`;
    const gmailUrl = `googlegmail://co?to=support@truthguard.com&subject=${encodeURIComponent(feedbackSubject)}&body=${encodeURIComponent(emailBody)}`;
    const mailtoUrl = `mailto:support@truthguard.com?subject=${encodeURIComponent(feedbackSubject)}&body=${encodeURIComponent(emailBody)}`;

    try {
      // Try Gmail first
      const canOpenGmail = await Linking.canOpenURL(gmailUrl);
      if (canOpenGmail) {
        await Linking.openURL(gmailUrl);
        setFeedbackModal(false);
        setFeedbackSubject('');
        setFeedbackText('');
        return;
      }

      // Fallback to default mail app
      const canOpenMail = await Linking.canOpenURL(mailtoUrl);
      if (canOpenMail) {
        await Linking.openURL(mailtoUrl);
        setFeedbackModal(false);
        setFeedbackSubject('');
        setFeedbackText('');
        return;
      }

      // If both fail, copy to clipboard
      throw new Error('No email app available');
    } catch (error) {
      Clipboard.setString(`To: support@truthguard.com\nSubject: ${feedbackSubject}\n\n${emailBody}`);
      Alert.alert(
        'Feedback Copied',
        'Your feedback has been copied to clipboard. Please open Gmail and paste it in a new email to support@truthguard.com',
        [{ text: 'OK', onPress: () => {
          setFeedbackModal(false);
          setFeedbackSubject('');
          setFeedbackText('');
        }}]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User color="white" size={48} />
            </View>
          </View>
          <Text style={styles.name}>User Profile</Text>
          <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Mail color="#6366f1" size={20} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Email</Text>
                <Text style={styles.menuValue}>{user?.email}</Text>
              </View>
              <ChevronRight color="#9ca3af" size={20} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuIconContainer}>
                <Shield color="#6366f1" size={20} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Account Type</Text>
                <Text style={styles.menuValue}>Premium User</Text>
              </View>
              <ChevronRight color="#9ca3af" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Info</Text>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>TruthGuard v1.0</Text>
              <Text style={styles.infoText}>
                AI-powered fraud detection to protect you from deepfakes and job scams.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setFeedbackModal(true)}
            >
              <View style={styles.menuIconContainer}>
                <MessageSquare color="#6366f1" size={20} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>Send Feedback</Text>
                <Text style={styles.menuValue}>Share your thoughts</Text>
              </View>
              <ChevronRight color="#9ca3af" size={20} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut color="#ef4444" size={20} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={feedbackModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFeedbackModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFeedbackModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackModal(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.subjectInput}
                placeholder="Subject"
                placeholderTextColor="#9ca3af"
                value={feedbackSubject}
                onChangeText={setFeedbackSubject}
                returnKeyType="next"
              />

              <TextInput
                style={styles.feedbackInput}
                placeholder="Write your feedback here..."
                placeholderTextColor="#9ca3af"
                value={feedbackText}
                onChangeText={setFeedbackText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit={false}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setFeedbackModal(false);
                  setFeedbackSubject('');
                  setFeedbackText('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendFeedback}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  menuValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  subjectInput: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  feedbackInput: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    height: 120,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
