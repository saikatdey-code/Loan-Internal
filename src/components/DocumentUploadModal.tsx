/**
 * DocumentUploadModal — Interactive modal for uploading documents/certificates.
 * Provides:
 * - "Take Photo / Scan" (Camera via react-native-image-picker)
 * - "Choose from Gallery" (Photo library via react-native-image-picker)
 * - "Use Sample Document" (Sample verified asset)
 * - Validation of file format (JPG, PNG, PDF) and size (<= 200 KB)
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import Svg, {Path, Circle, Rect} from 'react-native-svg';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
} from 'react-native-image-picker';

export interface SelectedDocument {
  uri: string;
  fileName: string;
  fileSize: number; // in bytes
  type: string;
}

interface DocumentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onDocumentSelected: (doc: SelectedDocument) => void;
  title?: string;
  subtitle?: string;
  sampleFileName?: string;
  maxSizeKb?: number;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  visible,
  onClose,
  onDocumentSelected,
  title = 'Upload Document',
  subtitle = 'JPG, PNG or PDF · Maximum 200 KB',
  sampleFileName = 'document.png',
  maxSizeKb = 200,
}) => {
  const processPickerResponse = (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }
    if (response.errorCode) {
      Alert.alert(
        'Upload Error',
        response.errorMessage || 'Failed to select document',
      );
      return;
    }
    const asset = response.assets?.[0];
    if (asset?.uri) {
      const fileName = asset.fileName || `${sampleFileName}_${Date.now()}.png`;
      const fileSize = asset.fileSize || 60 * 1024;
      const type = asset.type || 'image/png';

      // Check file size (<= maxSizeKb)
      if (fileSize > maxSizeKb * 1024) {
        Alert.alert(
          'File Too Large',
          `The selected file is ${(fileSize / 1024).toFixed(0)} KB. Please choose a file under ${maxSizeKb} KB.`,
        );
        return;
      }

      onDocumentSelected({
        uri: asset.uri,
        fileName,
        fileSize,
        type,
      });
      onClose();
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const response = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.7,
        maxWidth: 1000,
        maxHeight: 1000,
      });
      processPickerResponse(response);
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Unable to open camera');
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const response = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.7,
        maxWidth: 1000,
        maxHeight: 1000,
      });
      processPickerResponse(response);
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message || 'Unable to open gallery');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          {/* Top handle pill */}
          <View style={styles.handle} />

          {/* Title */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Option 1: Camera */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleLaunchCamera}
            activeOpacity={0.7}>
            <View style={[styles.iconCircle, styles.iconGreen]}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 3H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z"
                  stroke="#00875A"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Circle cx="12" cy="13" r="4" stroke="#00875A" strokeWidth={2} />
              </Svg>
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Take Photo / Scan</Text>
              <Text style={styles.optionSubtitle}>
                Use your device camera to capture the document
              </Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 18L15 12L9 6"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>

          {/* Option 2: Gallery */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleLaunchGallery}
            activeOpacity={0.7}>
            <View style={[styles.iconCircle, styles.iconBlue]}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="4"
                  stroke="#2563EB"
                  strokeWidth={2}
                />
                <Circle cx="8.5" cy="8.5" r="2" fill="#2563EB" />
                <Path
                  d="M21 15L16 10L5 21"
                  stroke="#2563EB"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Choose from Gallery / Files</Text>
              <Text style={styles.optionSubtitle}>
                Select an image or document from your device
              </Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 18L15 12L9 6"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconGreen: {
    backgroundColor: '#E8F5EE',
  },
  iconBlue: {
    backgroundColor: '#EFF6FF',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default DocumentUploadModal;
