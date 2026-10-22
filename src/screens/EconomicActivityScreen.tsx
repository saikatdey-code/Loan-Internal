/**
 * EconomicActivityScreen — Proposed Economic Activity step matching the WEmanipur UI design.
 * Features:
 * - Back button & Language selector header + Centered Brand Logo
 * - Proposed Economic Activity banner card with briefcase icon badge
 * - "Proposed Economic Activity" section divider line
 * - "Economic Activity to be Taken Up with the Fund *" dropdown selector with Manipur economic activities
 * - Info strip 1: "Select the activity you plan to start or expand using WeManipur scheme."
 * - "Description of Proposed Activity (Optional)" multiline textarea with icon and 0/500 char counter
 * - Info strip 2: "You can provide more details in the next steps or during document verification if required."
 * - Manipur scenic landscape illustration footer
 * - Dual action buttons: "← Back" and "Save & Continue →"
 * - Keyboard-aware scrolling and input visibility
 */
import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

import {Logo, useToast, WatermarkBackground} from '../components';
import SelectionModal, {OptionItem} from '../components/SelectionModal';

import type {RootStackScreenProps} from '../types/navigation';
import {isFieldEditable} from '../utils/fieldPermissions';
import {
  getLoanId,
  setLoanId,
  getStoredLoanDetails,
  setStoredLoanDetails,
} from '../services/storage';
import {
  getOccupations,
  getLoanList,
  getLoanDetailsAuth,
  submitEconomicActivityDetails,
  SubmitEconomicActivityPayload,
} from '../api/loan';

type Props = RootStackScreenProps<'EconomicActivity'>;

type ScrollViewInstance = React.ElementRef<typeof ScrollView>;
type TextInputInstance = React.ElementRef<typeof TextInput>;
type ViewInstance = React.ElementRef<typeof View>;

// Fallback Occupations list matching API
const FALLBACK_OCCUPATIONS: OptionItem[] = [
  {id: '18', label: 'Bakery Products'},
  {id: '12', label: 'Dairy Farming'},
  {id: '11', label: 'Fish Farming'},
  {id: '9', label: 'Food Processing'},
  {id: '16', label: 'Fruit Processing'},
  {id: '8', label: 'Handicrafts'},
  {id: '7', label: 'Handloom Weaving'},
  {id: '14', label: 'Mushroom Cultivation'},
  {id: '15', label: 'Nursery and Floriculture'},
  {id: '13', label: 'Organic Farming'},
  {id: '10', label: 'Poultry Farming'},
  {id: '17', label: 'Spice Processing'},
  {id: '21', label: 'Test New'},
];

const EconomicActivityScreen: React.FC<Props> = ({navigation, route}) => {
  const toast = useToast();
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);
  const descInputRef = useRef<TextInputInstance | null>(null);
  const descWrapperRef = useRef<ViewInstance | null>(null);

  // Track keyboard height to adjust ScrollView insets, especially on Android
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToInput = useCallback(
    (targetRef?: React.RefObject<any>, fallbackY = 0) => {
      setTimeout(() => {
        if (targetRef?.current && scrollViewRef.current) {
          (targetRef.current as any).measureLayout?.(
            scrollViewRef.current,
            (_left: number, top: number) => {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, top - 80),
                animated: true,
              });
            },
            () => {
              if (fallbackY > 0) {
                scrollViewRef.current?.scrollTo({y: fallbackY, animated: true});
              }
            },
          );
        } else if (fallbackY > 0) {
          scrollViewRef.current?.scrollTo({y: fallbackY, animated: true});
        }
      }, Platform.OS === 'android' ? 180 : 80);
    },
    [],
  );

  // Form State
  const [loanId, setLoanId] = useState<string>('');
  const [loanStatus, setLoanStatus] = useState<string>(
    route.params?.loanStatus || '',
  );
  const [fieldList, setFieldList] = useState<any>(
    route.params?.fieldList || null,
  );
  const [occupationOptions, setOccupationOptions] =
    useState<OptionItem[]>(FALLBACK_OCCUPATIONS);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [selectedActivityLabel, setSelectedActivityLabel] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingOccupations, setIsLoadingOccupations] =
    useState<boolean>(false);

  // Field Edit Permissions (if rejected, only allow fields in fieldList)
  const isEconomicActivityEditable = isFieldEditable(
    'economicActivity',
    fieldList,
    loanStatus,
  );
  const isDescEditable = isFieldEditable(
    'descriptionOfProposedActivity',
    fieldList,
    loanStatus,
  );

  // Modals & Focus States
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);

  // Error State
  const [activityError, setActivityError] = useState<string>('');

  // ─── Fetch Occupations & Initialize on Mount ──────────────────
  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      try {
        const storedLoanId = await getLoanId();
        const storedDetails = await getStoredLoanDetails<any>();

        const isInvalidId = (id?: string | null) =>
          !id ||
          id === 'b6c25f77-857d-499c-a712-c64bcd9317a7' ||
          id === 'b69488e4-3d79-4688-b80f-2e01a8a562ba' ||
          id === '1b268acc-508c-4fca-94ca-a3cd4d23fc47';

        let activeId = route.params?.loanId;
        if (isInvalidId(activeId)) {
          if (!isInvalidId(storedLoanId)) {
            activeId = storedLoanId!;
          }
        }
        if (isInvalidId(activeId)) {
          if (!isInvalidId(storedDetails?.id)) {
            activeId = storedDetails.id;
          }
        }
        if (isInvalidId(activeId)) {
          try {
            const listRes = await getLoanList();
            if (listRes?.success && listRes.data?.rows?.length > 0) {
              activeId = listRes.data.rows[0].id;
              await setLoanId(activeId);
            }
          } catch (listErr) {
            console.warn('[EconomicActivity] Failed to fetch loan list:', listErr);
          }
        }

        if (activeId && !isInvalidId(activeId)) {
          setLoanId(activeId);
        }

        let targetDetails = route.params?.loanDetails || storedDetails;

        // Fetch fresh details if activeId is valid
        if (activeId && !isInvalidId(activeId)) {
          try {
            const detailsRes = await getLoanDetailsAuth(activeId);
            if (detailsRes?.success && detailsRes?.data) {
              targetDetails = {...(targetDetails || {}), ...detailsRes.data};
              await setStoredLoanDetails(targetDetails);
            }
          } catch (fetchErr) {
            console.warn('[EconomicActivity] Failed to fetch loan details:', fetchErr);
          }
        }

        if (targetDetails) {
          if (targetDetails.loanStatus && !route.params?.loanStatus) {
            setLoanStatus(targetDetails.loanStatus);
          }
          if (targetDetails.fieldList && !route.params?.fieldList) {
            setFieldList(targetDetails.fieldList);
          }
          if (
            targetDetails.descriptionOfProposedActivity !== undefined &&
            targetDetails.descriptionOfProposedActivity !== null
          ) {
            setDescription(String(targetDetails.descriptionOfProposedActivity));
          }
        }

        // Fetch occupation list from GET /api/occupation
        setIsLoadingOccupations(true);
        const res = await getOccupations();
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: OptionItem[] = res.data.map(item => ({
            id: String(item.id),
            label: item.name,
          }));
          setOccupationOptions(mapped);

          // Populate if previously saved
          const savedActivity =
            targetDetails?.economicActivity ||
            targetDetails?.occupation ||
            targetDetails?.occupationDetails?.id;
          if (savedActivity) {
            const targetId = String(savedActivity);
            const match = mapped.find(o => o.id === targetId);
            if (match) {
              setSelectedActivityId(match.id);
              setSelectedActivityLabel(match.label);
            }
          }
        }
      } catch (err) {
        console.warn(
          '[EconomicActivity] Failed to fetch occupations from API, using fallback:',
          err,
        );
      } finally {
        if (isMounted) {
          setIsLoadingOccupations(false);
        }
      }
    };

    initialize();
    return () => {
      isMounted = false;
    };
  }, [route.params?.loanId, route.params?.loanDetails]);

  const scrollToField = (_yOffset: number) => {
    scrollToInput(descWrapperRef, _yOffset);
  };

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSaveAndContinue = async () => {
    if (!selectedActivityId) {
      setActivityError('Please select your proposed economic activity');
      toast.error('Please select your proposed economic activity');
      Alert.alert(
        'Required Field',
        'Please select the economic activity to be taken up with the fund.',
      );
      return;
    }

    setActivityError('');
    setIsSubmitting(true);

    try {
      const isInvalidId = (id?: string | null) =>
        !id ||
        id === 'b6c25f77-857d-499c-a712-c64bcd9317a7' ||
        id === 'b69488e4-3d79-4688-b80f-2e01a8a562ba' ||
        id === '1b268acc-508c-4fca-94ca-a3cd4d23fc47';

      let activeLoanId = loanId || route.params?.loanId;
      if (isInvalidId(activeLoanId)) {
        const storedId = await getLoanId();
        if (!isInvalidId(storedId)) {
          activeLoanId = storedId!;
        }
      }
      if (isInvalidId(activeLoanId)) {
        const stored = await getStoredLoanDetails<any>();
        if (!isInvalidId(stored?.id)) {
          activeLoanId = stored.id;
        }
      }

      const payload: SubmitEconomicActivityPayload = {
        loanId: activeLoanId || '',
        economicActivity: selectedActivityId,
        otherEconomicGroup: null,
        descriptionOfProposedActivity: description.trim(),
      };

      const response = await submitEconomicActivityDetails(payload);

      if (response && response.success) {
        toast.success(
          response.message || 'Economic activity details saved successfully',
        );

        const nextLoanId = response.data?.id || activeLoanId || '';
        if (nextLoanId) {
          await setLoanId(nextLoanId);
        }

        try {
          const stored = (await getStoredLoanDetails<any>()) || {};
          await setStoredLoanDetails({
            ...stored,
            economicActivity: selectedActivityId,
            descriptionOfProposedActivity: description.trim(),
            ...(response.data || {}),
          });
        } catch (e) {
          console.warn('[EconomicActivity] Failed to cache details:', e);
        }

        navigation.navigate('ReviewApplication', {
          loanId: nextLoanId,
          applicationNumber:
            response.data?.applicationNumber ||
            route.params?.applicationNumber,
          fieldList: fieldList || response.data?.fieldList,
          loanStatus: loanStatus || response.data?.loanStatus,
          isEdit: route.params?.isEdit,
        });
      } else {
        const errorMsg =
          response?.message || 'Failed to submit economic activity';
        toast.error(errorMsg);
        Alert.alert('Submission Error', errorMsg);
      }
    } catch (err: any) {
      console.error('[EconomicActivity] Submit error:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Unable to submit details. Please try again.';
      toast.error(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Handle Skip ─────────────────────────────────────────────
  const handleSkip = () => {
    navigation.navigate('MainTabs', {screen: 'Home'} as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Official Manipur Kangla Sha Watermark */}
      <WatermarkBackground opacity={0.06} />

      {/* ══════════════════════════════════════════════════════
          TOP NAVIGATION HEADER
         ══════════════════════════════════════════════════════ */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.topHeader}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 12H5M5 12L12 19M5 12L12 5"
                stroke="#00875A"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Centered Brand Logo */}
          <View style={styles.centerLogo}>
            <Logo size="small" showSubtitle={true} />
          </View>

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.skipText}>Skip</Text>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 12H19M19 12L12 5M19 12L12 19"
                stroke="#00875A"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

      {/* ══════════════════════════════════════════════════════
          KEYBOARD-AWARE SCROLL CONTAINER
         ══════════════════════════════════════════════════════ */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View>
          {/* Banner Card */}
          <View style={styles.bannerCard}>
            <View style={styles.avatarBadge}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                {/* Briefcase Icon */}
                <Rect
                  x="2"
                  y="7"
                  width="20"
                  height="14"
                  rx="3"
                  stroke="#00875A"
                  strokeWidth={2}
                />
                <Path
                  d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7"
                  stroke="#00875A"
                  strokeWidth={2}
                />
                <Path
                  d="M12 12V14"
                  stroke="#00875A"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <Path
                  d="M2 12H22"
                  stroke="#00875A"
                  strokeWidth={1.8}
                />
              </Svg>
            </View>
            <View style={styles.bannerTextWrapper}>
              <Text style={styles.bannerTitle}>Proposed Economic Activity</Text>
              <Text style={styles.bannerSubtitle}>
                Select the economic activity to be taken up with the fund.
              </Text>
            </View>
          </View>

          {/* Section Divider: Proposed Economic Activity */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Proposed Economic Activity</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 1: ECONOMIC ACTIVITY DROPDOWN *
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Economic Activity to be Taken Up with the Fund{' '}
              <Text style={styles.redAsterisk}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownWrapper,
                Boolean(activityError) && styles.inputWrapperError,
                !isEconomicActivityEditable && styles.dropdownWrapperDisabled,
              ]}
              disabled={!isEconomicActivityEditable || isSubmitting}
              onPress={() => isEconomicActivityEditable && setActivityModalVisible(true)}
              activeOpacity={0.85}>
              <View style={styles.fieldIcon}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="2"
                    y="7"
                    width="20"
                    height="14"
                    rx="3"
                    stroke="#64748B"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7"
                    stroke="#64748B"
                    strokeWidth={1.8}
                  />
                </Svg>
              </View>
              <Text
                style={[
                  styles.dropdownText,
                  !selectedActivityLabel && styles.placeholderText,
                ]}
                numberOfLines={1}>
                {selectedActivityLabel || 'Choose Economic Activity'}
              </Text>
              <View style={styles.rightActionIcon}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M6 9L12 15L18 9"
                    stroke="#00875A"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            </TouchableOpacity>
            {activityError ? (
              <Text style={styles.errorText}>{activityError}</Text>
            ) : null}
          </View>

          {/* Info Strip 1 */}
          <View style={styles.infoStrip}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIconLetter}>i</Text>
            </View>
            <Text style={styles.infoStripText}>
              Select the activity you plan to start or expand using WeManipur
              scheme.
            </Text>
          </View>

          {/* ══════════════════════════════════════════════════════
              FIELD 2: DESCRIPTION OF PROPOSED ACTIVITY (OPTIONAL)
             ══════════════════════════════════════════════════════ */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Description of Proposed Activity (Optional)
            </Text>
            <Text style={styles.fieldHint}>
              Provide a brief description of your proposed activity, how you
              will use the loan and expected outcome.
            </Text>

            {/* Textarea Container */}
            <Pressable
              ref={descWrapperRef}
              style={[
                styles.textareaContainer,
                isDescFocused && styles.textareaContainerFocused,
                !isDescEditable && styles.textareaContainerDisabled,
              ]}
              onPress={() => {
                if (isDescEditable) {
                  descInputRef.current?.focus();
                }
              }}>
              <View style={styles.textareaIcon} pointerEvents="none">
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="4"
                    y="3"
                    width="16"
                    height="18"
                    rx="3"
                    stroke="#64748B"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M8 8H16M8 12H16M8 16H12"
                    stroke="#64748B"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <TextInput
                ref={descInputRef}
                style={[
                  styles.textareaInput,
                  !isDescEditable && styles.textareaInputDisabled,
                ]}
                value={description}
                onChangeText={text => setDescription(text.slice(0, 500))}
                placeholder="Briefly describe the proposed economic activity"
                placeholderTextColor="#94A3B8"
                multiline
                scrollEnabled={false}
                numberOfLines={4}
                textAlignVertical="top"
                editable={isDescEditable && !isSubmitting}
                onFocus={() => {
                  if (isDescEditable) {
                    setIsDescFocused(true);
                    scrollToInput(descWrapperRef, 240);
                  }
                }}
                onBlur={() => setIsDescFocused(false)}
              />
            </Pressable>

            {/* Character Counter */}
            <Text style={styles.charCounter}>{description.length}/500</Text>
          </View>

          {/* Info Strip 2 */}
          <View style={styles.infoStrip}>
            <View style={styles.infoIconCircle}>
              <Text style={styles.infoIconLetter}>i</Text>
            </View>
            <Text style={styles.infoStripText}>
              You can provide more details in the next steps or during document
              verification if required.
            </Text>
          </View>

          {/* Bottom Buttons Row: [ ← Back ] [ Save & Continue → ] */}
          <View style={styles.bottomButtonsRow}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBack}
              disabled={isSubmitting}
              activeOpacity={0.75}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="#00875A"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            {/* Save & Continue Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isSubmitting && styles.primaryButtonDisabled,
              ]}
              onPress={handleSaveAndContinue}
              disabled={isSubmitting}
              activeOpacity={0.85}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Save & Continue</Text>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 12H19M19 12L12 5M19 12L12 19"
                      stroke="#FFFFFF"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>



      {/* ══════════════════════════════════════════════════════
          MODALS
         ══════════════════════════════════════════════════════ */}
      {/* Economic Activity Selection Modal */}
      <SelectionModal
        visible={activityModalVisible}
        title="Select Proposed Economic Activity"
        options={occupationOptions}
        selectedValue={selectedActivityId}
        onSelect={opt => {
          setSelectedActivityId(opt.id);
          setSelectedActivityLabel(opt.label);
          setActivityError('');
        }}
        onClose={() => setActivityModalVisible(false)}
      />


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Top Header Row
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  backText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#00875A',
  },
  centerLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 70,
  },
  skipText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#00875A',
  },
  headerSpacer: {
    minWidth: 70,
  },


  // Main Scroll Container
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 110, // space above landscape footer
  },

  // Banner Card
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF8F3',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTextWrapper: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#00875A',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#B6E3CB',
    marginLeft: 10,
  },

  // Field Group
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  redAsterisk: {
    color: '#EF4444',
    fontWeight: '700',
  },

  // Dropdown Wrapper
  dropdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1.2,
    borderColor: '#D8DDE1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  dropdownWrapperDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#D8DDE1',
  },
  dropdownText: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#64748B',
    fontWeight: '400',
  },
  fieldIcon: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActionIcon: {
    paddingLeft: 8,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },

  // Info Notice Strip
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F6FE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  infoIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoIconLetter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  infoStripText: {
    flex: 1,
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 16,
  },

  // Textarea Container
  textareaContainer: {
    flexDirection: 'row',
    borderWidth: 1.2,
    borderColor: '#D8DDE1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
    minHeight: 110,
  },
  textareaContainerDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#D8DDE1',
  },
  textareaContainerFocused: {
    borderColor: '#00875A',
    backgroundColor: '#FAFCFA',
    shadowColor: '#00875A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  textareaIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  textareaInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 2 : 0,
    paddingBottom: 4,
    paddingHorizontal: 0,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textareaInputDisabled: {
    color: '#334155',
  },
  charCounter: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 4,
  },

  // Bottom Buttons Row: [ ← Back ] [ Save & Continue → ]
  bottomButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 0.42,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00875A',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#00875A',
  },
  primaryButton: {
    flex: 0.58,
    height: 50,
    backgroundColor: '#00875A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#00875A',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },

  bottomSpacer: {
    height: 10,
  },
});

export default EconomicActivityScreen;
