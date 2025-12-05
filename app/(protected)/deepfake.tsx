import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image as RNImage,
  Alert,
  SafeAreaView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { detectDeepfake, DeepfakeResult } from '@/lib/rd';
import { Button } from '@/components/Button';
import { ResultCard } from '@/components/ResultCard';
import { ArrowLeft, Upload } from 'lucide-react-native';
import { trackDeepfakeScan } from '@/lib/statistics';
import { useAuth } from '@/lib/auth-context';

export default function DeepfakeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<DeepfakeResult | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera roll permissions are required to upload media.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedMedia(result.assets[0].uri);
      setResult(null);
    }
  };

  const analyzeMedia = async () => {
    if (!selectedMedia) {
      Alert.alert('No Media', 'Please select an image or video first.');
      return;
    }

    setAnalyzing(true);
    try {
      const detectionResult = await detectDeepfake(selectedMedia);
      setResult(detectionResult);

      // Track the scan in database
      if (user?.email) {
        await trackDeepfakeScan({
          userEmail: user.email,
          scanResult: detectionResult.result as 'REAL' | 'FAKE' | 'SUSPECT',
          fileType: selectedMedia.includes('video') ? 'video' : 'image',
          riskScore: detectionResult.riskScore,
        });
      }
    } catch (error: any) {
      Alert.alert('Analysis Failed', error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getResultVariant = (
    resultType: string
  ): 'success' | 'warning' | 'danger' => {
    switch (resultType) {
      case 'REAL':
        return 'success';
      case 'SUSPECT':
        return 'warning';
      case 'FAKE':
        return 'danger';
      default:
        return 'warning';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Deepfake Detection</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Upload media to check for AI-generated content
          </Text>
        </View>

        <View style={styles.content}>
          {!selectedMedia ? (
            <TouchableOpacity
              onPress={pickImage}
              style={styles.uploadBox}
            >
              <View style={styles.uploadIcon}>
                <Upload color="#6366f1" size={48} />
              </View>
              <Text style={styles.uploadTitle}>Upload Media</Text>
              <Text style={styles.uploadSubtitle}>
                Select an image or video from your device
              </Text>
            </TouchableOpacity>
          ) : (
            <View>
              <View style={styles.mediaContainer}>
                <RNImage
                  source={{ uri: selectedMedia }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.changeMediaButton}
                >
                  <Text style={styles.changeMediaText}>Change Media</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Analyze Media"
                onPress={analyzeMedia}
                loading={analyzing}
                style={styles.analyzeButton}
              />

              {result && (
                <View style={styles.resultsContainer}>
                  <Text style={styles.resultsTitle}>Analysis Results</Text>

                  <ResultCard
                    title="Detection Result"
                    value={result.result}
                    variant={getResultVariant(result.result)}
                  />

                  <ResultCard
                    title="Risk Score"
                    value={`${result.riskScore}%`}
                    variant={
                      result.riskScore < 30
                        ? 'success'
                        : result.riskScore < 70
                        ? 'warning'
                        : 'danger'
                    }
                  />

                  <ResultCard
                    title="Confidence"
                    value={`${(result.probability * 100).toFixed(1)}%`}
                    variant="neutral"
                  />

                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationLabel}>Explanation</Text>
                    <Text style={styles.explanationText}>
                      {result.explanation}
                    </Text>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${result.riskScore}%`,
                          backgroundColor:
                            result.riskScore < 30
                              ? '#10b981'
                              : result.riskScore < 70
                              ? '#f59e0b'
                              : '#ef4444',
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#c7d2fe',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  uploadBox: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#a5b4fc',
    borderRadius: 24,
    paddingHorizontal: 48,
    paddingVertical: 48,
    alignItems: 'center',
  },
  uploadIcon: {
    backgroundColor: '#e0e7ff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  uploadSubtitle: {
    color: '#4b5563',
    textAlign: 'center',
  },
  mediaContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  mediaImage: {
    width: '100%',
    height: 256,
    borderRadius: 16,
  },
  changeMediaButton: {
    marginTop: 16,
  },
  changeMediaText: {
    color: '#6366f1',
    textAlign: 'center',
    fontWeight: '600',
  },
  analyzeButton: {
    marginBottom: 24,
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
  },
  explanationBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 16,
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  explanationText: {
    color: '#4b5563',
    lineHeight: 24,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 16,
  },
  progressBar: {
    height: '100%',
  },
});
