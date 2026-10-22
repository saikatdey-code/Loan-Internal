/**
 * PhotoUploadModal — Interactive modal for applicant photo upload.
 * Provides:
 * - "Take Photo" (Camera via react-native-image-picker)
 * - "Choose from Gallery" (Photo library via react-native-image-picker)
 * - "Use Verified Sample Photo" (Passport portrait asset)
 * - Validation of file format (JPG, PNG, WEBP) and size (<= 50 KB)
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import Svg, {Path, Circle, Rect} from 'react-native-svg';
import {launchCamera, launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';

export interface SelectedPhoto {
  uri: string;
  fileName: string;
  fileSize: number; // in bytes
  type: string;
}

interface PhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoSelected: (photo: SelectedPhoto) => void;
}

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  visible,
  onClose,
  onPhotoSelected,
}) => {
  const processPickerResponse = async (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }
    if (response.errorCode) {
      Alert.alert('Upload Error', response.errorMessage || 'Failed to select image');
      return;
    }
    const asset = response.assets?.[0];
    if (asset?.uri) {
      const originalFileName = asset.fileName || `applicant_photo_${Date.now()}.jpg`;
      const fileName = originalFileName.replace(/\.(png|webp|heic|jpeg)$/i, '.jpg');
      const type = 'image/jpeg';

      // Check format
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      const ext = originalFileName.split('.').pop()?.toLowerCase() || 'jpg';
      if (!validExtensions.includes(ext)) {
        Alert.alert(
          'Invalid Format',
          'Please select a JPG, PNG, or WEBP photograph.',
        );
        return;
      }

      // Check file size (User must upload an image within 50 KB)
      let fileSize = asset.fileSize;
      if (!fileSize && asset.uri) {
        try {
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          fileSize = blob.size;
        } catch (err) {
          console.warn('[PhotoUploadModal] Failed to get blob size:', err);
        }
      }

      const MAX_FILE_SIZE = 50 * 1024; // 50 KB
      if (fileSize && fileSize > MAX_FILE_SIZE) {
        Alert.alert(
          'File Size Exceeded',
          `The selected photo (${(fileSize / 1024).toFixed(1)} KB) exceeds the maximum allowed size of 50 KB. Please select or compress a photo within 50 KB.`,
        );
        return;
      }

      onPhotoSelected({
        uri: asset.uri,
        fileName,
        fileSize: fileSize || 0,
        type,
      });
      onClose();
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const response = await launchCamera({
        mediaType: 'photo',
        cameraType: 'front',
        saveToPhotos: false,
      });
      await processPickerResponse(response);
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Unable to open camera');
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const response = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
      });
      await processPickerResponse(response);
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
          <Text style={styles.title}>Upload Photograph of Applicant</Text>
          <Text style={styles.subtitle}>
            Select or capture a photo (Maximum 50 KB)
          </Text>

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
              <Text style={styles.optionTitle}>Take Photo</Text>
              <Text style={styles.optionSubtitle}>
                Capture applicant photo via camera (Max 50 KB)
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
              <Text style={styles.optionTitle}>Choose from Gallery</Text>
              <Text style={styles.optionSubtitle}>
                Select applicant photo from gallery (Max 50 KB)
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
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    backgroundColor: '#ECFDF5',
  },
  iconBlue: {
    backgroundColor: '#EFF6FF',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
  },
  cancelBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
});

export default PhotoUploadModal;
