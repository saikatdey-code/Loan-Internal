/**
 * CalendarModal — Interactive calendar modal for selecting Date of Birth.
 * Features:
 * - Quick Month and Year selectors (easy jump to 1950-2010 birth years)
 * - Weekday headers (Su, Mo, Tu, We, Th, Fr, Sa)
 * - Days grid with active date highlight in brand green (#00875A)
 * - Disables future dates (Date of Birth cannot be in future)
 * - Formats output into standard DD-MM-YYYY format
 */
import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Colors} from '../constants/colors';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateString: string) => void;
  initialDate?: string; // DD-MM-YYYY
  title?: string;
  defaultToCurrentYear?: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Years range for birth dates: from 1940 to current year
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({length: CURRENT_YEAR - 1940 + 1}, (_, i) => 1940 + i).reverse();

const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  title,
  defaultToCurrentYear,
}) => {
  // Parse initialDate if given
  const parsedInitial = useMemo(() => {
    if (initialDate && initialDate.includes('-')) {
      const parts = initialDate.split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1900 && y <= CURRENT_YEAR) {
          return {day: d, month: m, year: y};
        }
      }
    }
    // If defaultToCurrentYear is true or title indicates non-birthdate (e.g. Formation Date)
    if (defaultToCurrentYear || (title && !title.toUpperCase().includes('BIRTH'))) {
      const now = new Date();
      return {day: now.getDate(), month: now.getMonth(), year: now.getFullYear()};
    }
    // Default to 25 years ago for birthdate convenience
    return {day: 15, month: 0, year: CURRENT_YEAR - 25};
  }, [initialDate, defaultToCurrentYear, title]);

  const [selectedDay, setSelectedDay] = useState(parsedInitial.day);
  const [selectedMonth, setSelectedMonth] = useState(parsedInitial.month);
  const [selectedYear, setSelectedYear] = useState(parsedInitial.year);

  const [viewMode, setViewMode] = useState<'calendar' | 'yearPicker' | 'monthPicker'>(
    'calendar',
  );

  useEffect(() => {
    if (visible) {
      setSelectedDay(parsedInitial.day);
      setSelectedMonth(parsedInitial.month);
      setSelectedYear(parsedInitial.year);
      setViewMode('calendar');
    }
  }, [visible, parsedInitial]);

  // Today
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  // Number of days in current view month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(selectedYear, selectedMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      if (selectedYear > 1940) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      }
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (
      selectedYear === todayYear &&
      selectedMonth >= todayMonth
    ) {
      return; // Cannot go into future
    }
    if (selectedMonth === 11) {
      if (selectedYear < todayYear) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      }
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleConfirm = () => {
    const d = String(selectedDay).padStart(2, '0');
    const m = String(selectedMonth + 1).padStart(2, '0');
    const y = String(selectedYear);
    onSelectDate(`${d}-${m}-${y}`);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalSubheading}>
                {title || 'SELECT DATE OF BIRTH'}
              </Text>
              <Text style={styles.modalDateDisplay}>
                {String(selectedDay).padStart(2, '0')} {MONTH_NAMES[selectedMonth]}{' '}
                {selectedYear}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="#64748B"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Navigation Controls: Month & Year Tabs */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.monthYearSelector}
              onPress={() =>
                setViewMode(viewMode === 'monthPicker' ? 'calendar' : 'monthPicker')
              }>
              <Text style={styles.monthYearText}>{MONTH_NAMES[selectedMonth]}</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9L12 15L18 9"
                  stroke={Colors.primary}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.monthYearSelector}
              onPress={() =>
                setViewMode(viewMode === 'yearPicker' ? 'calendar' : 'yearPicker')
              }>
              <Text style={styles.monthYearText}>{selectedYear}</Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9L12 15L18 9"
                  stroke={Colors.primary}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>

            {/* Arrows */}
            <View style={styles.arrowsGroup}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.arrowButton}
                activeOpacity={0.7}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M15 18L9 12L15 6"
                    stroke="#1E293B"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNextMonth}
                style={[
                  styles.arrowButton,
                  selectedYear === todayYear &&
                    selectedMonth >= todayMonth &&
                    styles.arrowDisabled,
                ]}
                disabled={selectedYear === todayYear && selectedMonth >= todayMonth}
                activeOpacity={0.7}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18L15 12L9 6"
                    stroke={
                      selectedYear === todayYear && selectedMonth >= todayMonth
                        ? '#CBD5E1'
                        : '#1E293B'
                    }
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          {/* VIEW: Year Quick Picker */}
          {viewMode === 'yearPicker' && (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerSectionTitle}>Select Year of Birth</Text>
              <ScrollView
                style={styles.pickerScrollView}
                contentContainerStyle={styles.pickerGrid}
                showsVerticalScrollIndicator={false}>
                {YEARS.map(yr => {
                  const isSelected = yr === selectedYear;
                  return (
                    <TouchableOpacity
                      key={yr}
                      style={[
                        styles.pickerItem,
                        isSelected && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedYear(yr);
                        setViewMode('calendar');
                      }}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          isSelected && styles.pickerItemTextSelected,
                        ]}>
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* VIEW: Month Quick Picker */}
          {viewMode === 'monthPicker' && (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerSectionTitle}>Select Month</Text>
              <View style={styles.monthGrid}>
                {MONTH_NAMES.map((mName, idx) => {
                  const isSelected = idx === selectedMonth;
                  const isFuture =
                    selectedYear === todayYear && idx > todayMonth;
                  return (
                    <TouchableOpacity
                      key={mName}
                      disabled={isFuture}
                      style={[
                        styles.monthItem,
                        isSelected && styles.pickerItemSelected,
                        isFuture && styles.monthItemDisabled,
                      ]}
                      onPress={() => {
                        setSelectedMonth(idx);
                        setViewMode('calendar');
                      }}>
                      <Text
                        style={[
                          styles.monthItemText,
                          isSelected && styles.pickerItemTextSelected,
                          isFuture && styles.monthItemTextDisabled,
                        ]}>
                        {mName.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* VIEW: Standard Calendar Days Grid */}
          {viewMode === 'calendar' && (
            <View style={styles.calendarGrid}>
              {/* Weekday headers */}
              <View style={styles.weekdaysRow}>
                {WEEK_DAYS.map(day => (
                  <Text key={day} style={styles.weekdayText}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Day cells */}
              <View style={styles.daysContainer}>
                {/* Empty cells before month start */}
                {Array.from({length: firstDayWeekday}).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.emptyDayCell} />
                ))}

                {/* Days 1..N */}
                {Array.from({length: daysInMonth}).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected = dayNum === selectedDay;
                  const isFuture =
                    selectedYear === todayYear &&
                    selectedMonth === todayMonth &&
                    dayNum > todayDate;

                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      disabled={isFuture}
                      onPress={() => setSelectedDay(dayNum)}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellActive,
                      ]}>
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.dayTextActive,
                          isFuture && styles.dayTextDisabled,
                        ]}>
                        {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
              activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              style={styles.confirmButton}
              activeOpacity={0.85}>
              <Text style={styles.confirmButtonText}>Confirm Date</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
    marginBottom: 14,
  },
  modalSubheading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00875A',
    letterSpacing: 0.8,
  },
  modalDateDisplay: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthYearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3FAF6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  monthYearText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#00875A',
  },
  arrowsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  arrowDisabled: {
    opacity: 0.4,
  },
  calendarGrid: {
    marginBottom: 16,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDayCell: {
    width: '14.28%',
    height: 38,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    marginVertical: 2,
  },
  dayCellActive: {
    backgroundColor: '#00875A',
  },
  dayText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#0F172A',
  },
  dayTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: '#CBD5E1',
  },
  pickerContainer: {
    height: 230,
    marginBottom: 16,
  },
  pickerSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
    textAlign: 'center',
  },
  pickerScrollView: {
    flex: 1,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  pickerItem: {
    width: '30%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  pickerItemSelected: {
    backgroundColor: '#00875A',
  },
  pickerItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  pickerItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  monthItem: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  monthItemDisabled: {
    opacity: 0.35,
  },
  monthItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  monthItemTextDisabled: {
    color: '#94A3B8',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CalendarModal;
