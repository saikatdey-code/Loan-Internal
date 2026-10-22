/**
 * NotificationComponent — Displays user notifications or the empty state matching the design.
 * Fetches data from GET /api/notification/list?page=1&limit=10.
 * Accurately renders notification cards matching the provided UI:
 * - "Application and account updates are shown here." top text
 * - Outline "Refresh" button with green refresh icon
 * - Left green-accented card with ringing green bell icon in rounded badge
 * - Title (e.g. "Correction Needed"), "New" pill badge, description, and date (e.g. "01 Oct 2026")
 * - "Showing 1 to X of Y entries" footer
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {getNotificationList, NotificationItem} from '../api/notification';

interface NotificationComponentProps {
  onNotificationPress?: (item: NotificationItem) => void;
  initialItems?: NotificationItem[];
}

export const NotificationComponent: React.FC<NotificationComponentProps> = ({
  onNotificationPress,
  initialItems,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialItems || [],
  );
  const [totalCount, setTotalCount] = useState<number>(
    initialItems ? initialItems.length : 0,
  );
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(!initialItems);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const res = await getNotificationList(1, 10);
      if (res && res.success && res.data) {
        const rows = res.data.rows || [];
        setNotifications(rows);
        setTotalCount(res.data.count || rows.length);
        setPage(res.data.page || 1);
      } else {
        setNotifications([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.warn('[NotificationComponent] Error fetching notifications:', err);
      // Fallback empty list on error
      setNotifications([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialItems) {
      fetchNotifications();
    }
  }, [fetchNotifications, initialItems]);

  const handleRefresh = () => {
    fetchNotifications(true);
  };

  /**
   * Title generator based on API fields
   */
  const getNotificationTitle = (item: NotificationItem): string => {
    if (item.title) return item.title;
    if (item.notificationType) {
      if (item.notificationType === 'correctionNeeded') {
        return 'Correction Needed';
      }
      // Convert camelCase or kebab-case to Title Case
      return item.notificationType
        .replace(/([A-Z])/g, ' $1')
        .replace(/[-_]/g, ' ')
        .trim()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
    if (item.step) {
      if (item.step === 'review') return 'Application Under Review';
      return `Application - ${item.step.charAt(0).toUpperCase() + item.step.slice(1)}`;
    }
    if (item.applicationNumber || item.applicationId) {
      return 'Application Update';
    }
    return 'Notification Update';
  };

  /**
   * Message / Description generator based on API fields
   */
  const getNotificationDescription = (item: NotificationItem): string => {
    if (item.notificationType === 'correctionNeeded') {
      return 'Changes are required in your application. Please review and update the requested fields.';
    }

    if (item.message) return item.message;
    if (item.description) return item.description;
    if (item.comment && item.comment.trim() !== '') return item.comment;

    if (item.step === 'review') {
      return 'Your application has been submitted and is currently under official review.';
    }

    if (item.applicationId || item.applicationNumber) {
      return `Update regarding application ${item.applicationId || item.applicationNumber}.`;
    }

    return 'Application and account updates are shown here.';
  };

  /**
   * Format date like '01 Oct 2026'
   */
  const formatNotificationDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00875A" />
      </View>
    );
  }

  const hasNotifications = notifications.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          !hasNotifications && styles.emptyScrollContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#00875A']}
            tintColor="#00875A"
          />
        }>
      {/* ══════════════════════════════════════════════════════
          TOP HEADER SECTION (Updates text + Refresh button)
          ══════════════════════════════════════════════════════ */}
      <View style={styles.topControlContainer}>
        <Text style={styles.topHintText}>
          Application and account updates are shown here.
        </Text>

        <TouchableOpacity
          style={styles.refreshButton}
          activeOpacity={0.7}
          onPress={handleRefresh}
          disabled={isRefreshing}>
          {isRefreshing ? (
            <ActivityIndicator
              size="small"
              color="#00875A"
              style={{marginRight: 8}}
            />
          ) : (
            <Svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              style={{marginRight: 8}}>
              <Path
                d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4"
                stroke="#00875A"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"
                stroke="#00875A"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {!hasNotifications ? (
        /* ══════════════════════════════════════════════════════
           EMPTY STATE (Matches design reference)
           ══════════════════════════════════════════════════════ */
        <View style={styles.emptyContainer}>
          <View style={styles.bellIconWrap}>
            <Svg width={46} height={46} viewBox="0 0 24 24" fill="none">
              <Path
                d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke="#00875A"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke="#00875A"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySubtitle}>
            Your latest updates will appear here.
          </Text>
        </View>
      ) : (
        /* ══════════════════════════════════════════════════════
           NOTIFICATIONS LIST (Matches design screenshot)
           ══════════════════════════════════════════════════════ */
        <View style={styles.listContainer}>
          {notifications.map((item, index) => {
            const title = getNotificationTitle(item);
            const description = getNotificationDescription(item);
            const dateText = formatNotificationDate(
              item.createdAt || item.updatedAt || item.appliedAt,
            );
            const isUnread =
              item.seen === false || item.isRead === false || item.status === 'A';

            return (
              <TouchableOpacity
                key={item.id ? String(item.id) : `notif_${index}`}
                style={styles.notificationCard}
                activeOpacity={0.8}
                onPress={() => onNotificationPress?.(item)}>
                {/* Left Ringing Bell Badge */}
                <View style={styles.cardIconWrap}>
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                    {/* Left vibration tick */}
                    <Path
                      d="M3.5 11c-.7 1.3-.7 2.7 0 4"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    {/* Right vibration tick */}
                    <Path
                      d="M20.5 11c.7 1.3.7 2.7 0 4"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    {/* Bell body */}
                    <Path
                      d="M18 9a6 6 0 0 0-12 0c0 7-3 8.5-3 8.5h18s-3-1.5-3-8.5"
                      stroke="#00875A"
                      strokeWidth={1.9}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Clapper */}
                    <Path
                      d="M13.5 20.5a2 2 0 0 1-3 0"
                      stroke="#00875A"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>

                {/* Card Content */}
                <View style={styles.cardContent}>
                  {/* Title & "New" Badge Row */}
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    {isUnread && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>New</Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  <Text style={styles.cardMessage}>{description}</Text>

                  {/* Date Timestamp (e.g. 01 Oct 2026) */}
                  {Boolean(dateText) && (
                    <Text style={styles.cardTimestamp}>{dateText}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Footer: Showing 1 to X of Y entries */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Showing 1 to {notifications.length} of {totalCount || notifications.length} entries
            </Text>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    paddingBottom: 32,
  },
  emptyScrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Top Control Section
  topControlContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  topHintText: {
    fontSize: 13.5,
    color: '#64748B',
    marginBottom: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  refreshButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#00875A',
  },

  // Notifications List
  listContainer: {
    paddingHorizontal: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#00875A',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1.5,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F7F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'center',
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  cardMessage: {
    fontSize: 13.5,
    color: '#64748B',
    lineHeight: 19,
    marginTop: 2,
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '400',
  },

  // Bottom Pagination / Entries Text
  footerContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  // Empty State Styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  bellIconWrap: {
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationComponent;
