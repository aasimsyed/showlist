import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { Show } from '../types';

/**
 * Add event to device calendar
 */
export async function addEventToCalendar(show: Show, date: Date): Promise<void> {
  try {
    // Request calendar permissions
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Calendar access is needed to add events to your calendar.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Get default calendar
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];

    if (!defaultCalendar) {
      Alert.alert('Error', 'No calendar available');
      return;
    }

    // Parse time if available
    let startDate = new Date(date);
    let endDate = new Date(date);
    
    if (show.time) {
      const timeMatch = show.time.match(/(\d+):(\d+)\s*(am|pm)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toLowerCase();
        
        if (period === 'pm' && hours !== 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        startDate.setHours(hours, minutes, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(hours + 2, minutes, 0, 0); // Default 2 hour event
      } else {
        // Default to 8pm if time format not recognized
        startDate.setHours(20, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(22, 0, 0, 0);
      }
    } else {
      // Default to 8pm if no time
      startDate.setHours(20, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(22, 0, 0, 0);
    }

    // Create calendar event
    const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
      title: `${show.artist} at ${show.venue}`,
      startDate: startDate,
      endDate: endDate,
      location: show.address || show.venue,
      notes: show.eventLink ? `Tickets: ${show.eventLink}` : undefined,
      url: show.eventLink || undefined,
      timeZone: 'America/Chicago', // Austin timezone
    });

    Alert.alert('Success', 'Event added to your calendar!');
  } catch (error: any) {
    console.error('Error adding to calendar:', error);
    Alert.alert('Error', error.message || 'Failed to add event to calendar');
  }
}
