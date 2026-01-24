import { Share } from 'react-native';
import { Show } from '../types';

/**
 * Share an event via native share sheet
 */
export async function shareEvent(show: Show): Promise<void> {
  try {
    const shareText = `${show.artist} at ${show.venue}${show.time ? ` - ${show.time}` : ''}\n\n${show.eventLink || `https://austin.showlists.net`}`;
    
    await Share.share({
      message: shareText,
      title: `${show.artist} at ${show.venue}`,
    });
  } catch (error: any) {
    // User cancelled or error occurred
    if (error.message !== 'User did not share') {
      console.error('Error sharing event:', error);
    }
  }
}

/**
 * Generate a shareable deep link for an event
 */
export function generateEventLink(show: Show): string {
  // Simple deep link format - can be enhanced later
  const encoded = encodeURIComponent(`${show.artist}|${show.venue}|${show.time || ''}`);
  return `showlist://event/${encoded}`;
}
