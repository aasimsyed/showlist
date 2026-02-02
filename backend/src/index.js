/**
 * Cloudflare Worker to parse austin.showlists.net HTML and serve as JSON API
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname || '';

      // GET /api/cities: scrape https://www.showlists.net/ for city links
      if (pathname.includes('cities')) {
        const networkRes = await fetch('https://www.showlists.net/', {
          headers: { 'User-Agent': 'ShowlistApp/1.0' },
          cf: { cacheTtl: 3600, cacheEverything: true },
        });
        if (!networkRes.ok) {
          throw new Error(`Network page HTTP ${networkRes.status}`);
        }
        const networkHtml = await networkRes.text();
        const cities = parseNetworkCities(networkHtml);
        if (cities.length === 0) {
          throw new Error('No cities found on network page');
        }
        return new Response(
          JSON.stringify({ cities, lastUpdated: new Date().toISOString() }),
          {
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=3600',
            },
          }
        );
      }

      // GET /api/events?city=...: fetch that city's showlist
      const cityParam = (url.searchParams.get('city') || 'austin').toLowerCase().replace(/[^a-z-]/g, '') || 'austin';
      const showlistUrl = `https://${cityParam}.showlists.net/`;

      const response = await fetch(showlistUrl, {
        headers: {
          'User-Agent': 'ShowlistApp/1.0',
        },
        cf: {
          cacheTtl: 300,
          cacheEverything: true,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      const events = parseShowlistHTML(html);

      if (events.length === 0) {
        throw new Error('No events found in HTML');
      }

      return new Response(
        JSON.stringify({
          events,
          lastUpdated: new Date().toISOString(),
        }),
        {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
          },
        }
      );

    } catch (error) {
      console.error('Error fetching/parsing showlist:', error);
      
      return new Response(
        JSON.stringify({
          error: error.message || 'Failed to fetch events',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};

/**
 * Parse https://www.showlists.net/ HTML for city links (e.g. Cities dropdown).
 * Extracts links to *.showlists.net (excluding www) and returns { id, label }.
 */
function parseNetworkCities(html) {
  const cities = [];
  const re = /<a[^>]*href="https:\/\/([^."\/]+)\.showlists\.net[^"]*"[^>]*>([^<]+)<\/a>/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) !== null) {
    const id = m[1].toLowerCase();
    if (id === 'www') continue;
    const label = m[2].trim();
    if (label && !seen.has(id)) {
      seen.add(id);
      cities.push({ id, label });
    }
  }
  return cities;
}

/**
 * Parse HTML from austin.showlists.net
 * First tries to extract window.upcomingShows JavaScript object (easier and more reliable)
 * Falls back to HTML parsing if that fails
 */
function parseShowlistHTML(html) {
  // Try to extract the JavaScript data object first (much more reliable)
  const jsDataMatch = html.match(/window\.upcomingShows\s*=\s*(\[[\s\S]*?\]);/);
  if (jsDataMatch) {
    try {
      const jsData = JSON.parse(jsDataMatch[1]);
      return parseFromJSData(html, jsData);
    } catch (e) {
      console.error('Failed to parse JS data, falling back to HTML parsing:', e);
    }
  }
  
  // Fallback to HTML parsing
  return parseFromHTML(html);
}

/**
 * Parse events from the JavaScript data object + HTML for additional details
 */
function parseFromJSData(html, jsData) {
  const events = [];
  const eventsByDate = {};
  
  // Group shows by date
  for (const show of jsData) {
    const dateKey = show.date; // Format: "20260124"
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    
    // Get additional details from HTML if available
    const htmlDetails = getShowDetailsFromHTML(html, show.id);
    
    eventsByDate[dateKey].push({
      artist: show.title || 'Unknown Artist',
      venue: show.venueName || 'Unknown Venue',
      address: htmlDetails.address || show.venueName || '',
      eventLink: htmlDetails.eventLink || null,
      venueLink: htmlDetails.venueLink || null,
      mapLink: htmlDetails.mapLink || null,
      time: htmlDetails.time || null,
    });
  }
  
  // Convert to date-sorted array
  const sortedDates = Object.keys(eventsByDate).sort();
  for (const dateKey of sortedDates) {
    const date = formatDateFromKey(dateKey);
    events.push({
      date: date,
      shows: eventsByDate[dateKey],
    });
  }
  
  // Also get dates from HTML that might not be in JS data
  const htmlEvents = parseFromHTML(html);
  for (const htmlEvent of htmlEvents) {
    const existingEvent = events.find(e => e.date === htmlEvent.date);
    if (!existingEvent && htmlEvent.shows.length > 0) {
      events.push(htmlEvent);
    } else if (existingEvent) {
      // Merge shows
      const existingShowIds = new Set(existingEvent.shows.map(s => s.artist + s.venue));
      for (const show of htmlEvent.shows) {
        const showKey = show.artist + show.venue;
        if (!existingShowIds.has(showKey)) {
          existingEvent.shows.push(show);
        }
      }
    }
  }
  
  return events.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB;
  });
}

/**
 * Get additional show details from HTML by show ID
 */
function getShowDetailsFromHTML(html, showId) {
  const details = {
    address: null,
    eventLink: null,
    venueLink: null,
    mapLink: null,
    time: null,
  };
  
  // Find the li element with this show ID (handle both single and double quotes)
  const showIdRegex = new RegExp(`<li[^>]*data-show-id=["']?${showId}["']?[^>]*>([\\s\\S]*?)<\\/li>`, 'i');
  const match = html.match(showIdRegex);
  if (!match) {
    // Try without quotes
    const altRegex = new RegExp(`<li[^>]*data-show-id=${showId}[^>]*>([\\s\\S]*?)<\\/li>`, 'i');
    const altMatch = html.match(altRegex);
    if (!altMatch) return details;
    const liContent = altMatch[1];
    return extractDetailsFromLI(liContent);
  }
  
  const liContent = match[1];
  return extractDetailsFromLI(liContent);
}

/**
 * Extract show details from an <li> element content
 */
function extractDetailsFromLI(liContent) {
  const details = {
    address: null,
    eventLink: null,
    venueLink: null,
    mapLink: null,
    time: null,
  };
  
  // Extract event link - more flexible regex to handle attribute order
  // Matches: <a ... title="show link" ... href="..." ...> or <a ... href="..." ... title="show link" ...>
  const eventLinkMatch = liContent.match(/<a[^>]*title=["']show link["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
                        liContent.match(/<a[^>]*href=["']([^"']+)["'][^>]*title=["']show link["'][^>]*>/i);
  if (eventLinkMatch) details.eventLink = eventLinkMatch[1];
  
  // Extract venue link - more flexible regex
  const venueLinkMatch = liContent.match(/<a[^>]*title=["']venue link["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
                         liContent.match(/<a[^>]*href=["']([^"']+)["'][^>]*title=["']venue link["'][^>]*>/i);
  if (venueLinkMatch) details.venueLink = venueLinkMatch[1];
  
  // Extract map link - more flexible regex
  const mapLinkMatch = liContent.match(/<a[^>]*title=["']map link["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
                      liContent.match(/<a[^>]*href=["']([^"']+)["'][^>]*title=["']map link["'][^>]*>/i);
  if (mapLinkMatch) details.mapLink = mapLinkMatch[1];
  
  // Extract address from visually-hidden span (more flexible class matching)
  const addressMatch = liContent.match(/<span[^>]*class=["'][^"']*visually-hidden[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  if (addressMatch) {
    details.address = cleanHTML(addressMatch[1]);
  }
  
  // Extract time from <span class="text-gray">[time]</span> - handle whitespace
  const timeSpanMatch = liContent.match(/<span[^>]*class=["'][^"']*text-gray[^"']*["'][^>]*>[\s\S]*?\[([^\]]+)\][\s\S]*?<\/span>/i);
  if (timeSpanMatch) {
    details.time = timeSpanMatch[1].trim();
  } else {
    // Fallback: try to find [time] anywhere in the content
    const timeMatch = liContent.match(/\[([^\]]+)\]/);
    if (timeMatch) {
      const timeText = timeMatch[1].trim();
      // Only use if it looks like a time (contains : and pm/am)
      if (/:\d+\s*(pm|am|PM|AM)/i.test(timeText)) {
        details.time = timeText;
      }
    }
  }
  
  return details;
}

/**
 * Format date key (20260124) to display format (Saturday, January 24th 2026)
 */
function formatDateFromKey(dateKey) {
  try {
    const year = dateKey.substring(0, 4);
    const month = dateKey.substring(4, 6);
    const day = dateKey.substring(6, 8);
    const date = new Date(`${year}-${month}-${day}`);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  } catch (e) {
    return dateKey;
  }
}

/**
 * Parse HTML from austin.showlists.net (fallback method)
 * Structure: <h5>Date</h5> followed by <ul><li>Event</li></ul>
 */
function parseFromHTML(html) {
  const events = [];
  
  // Find all date headers (h5 tags)
  const dateRegex = /<h5[^>]*>(.*?)<\/h5>/gi;
  const dateMatches = [...html.matchAll(dateRegex)];
  
  for (let i = 0; i < dateMatches.length; i++) {
    const dateMatch = dateMatches[i];
    const dateText = cleanHTML(dateMatch[1]);
    
    // Find the content between this h5 and the next h5 (or end)
    const startIndex = dateMatch.index + dateMatch[0].length;
    const endIndex = i < dateMatches.length - 1 
      ? dateMatches[i + 1].index 
      : html.length;
    
    const sectionHTML = html.substring(startIndex, endIndex);
    
    // Find the <ul> tag in this section (shows are in a ul list)
    const ulMatch = sectionHTML.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
    const ulContent = ulMatch ? ulMatch[1] : sectionHTML;
    
    // Parse shows from this section
    const shows = parseShowsFromSection(ulContent);
    
    if (shows.length > 0 || dateText) {
      events.push({
        date: dateText || 'Unknown Date',
        shows: shows,
      });
    }
  }
  
  return events;
}

/**
 * Parse individual shows from a section of HTML
 */
function parseShowsFromSection(html) {
  const shows = [];
  
  // Find all list items - look for <li> tags with showlist-item class
  // Use a more specific pattern to avoid matching nested content incorrectly
  const liRegex = /<li[^>]*class=["'][^"']*showlist-item[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
  const liMatches = [...html.matchAll(liRegex)];
  
  // If no matches with showlist-item, try generic li tags
  if (liMatches.length === 0) {
    const genericLiRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const genericMatches = [...html.matchAll(genericLiRegex)];
    for (const liMatch of genericMatches) {
      const liContent = liMatch[1];
      const show = parseShowFromLI(liContent);
      if (show && show.artist) {
        shows.push(show);
      }
    }
  } else {
    for (const liMatch of liMatches) {
      const liContent = liMatch[1];
      const show = parseShowFromLI(liContent);
      
      if (show && show.artist) {
        shows.push(show);
      }
    }
  }
  
  return shows;
}

/**
 * Parse a single show from an <li> element
 * Format: <a title="show link">Artist</a> at <a title="venue link">Venue</a> (address) [time]
 */
function parseShowFromLI(liContent) {
  try {
    // Extract artist link (use [\s\S] to match across newlines)
    const artistLinkMatch = liContent.match(/<a[^>]*title=["']show link["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const artist = artistLinkMatch ? cleanHTML(artistLinkMatch[2]) : null;
    const eventLink = artistLinkMatch ? artistLinkMatch[1] : null;
    
    // Extract venue link (use [\s\S] to match across newlines)
    const venueLinkMatch = liContent.match(/<a[^>]*title=["']venue link["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    const venue = venueLinkMatch ? cleanHTML(venueLinkMatch[2]) : null;
    const venueLink = venueLinkMatch ? venueLinkMatch[1] : null;
    
    // Extract map link
    const mapLinkMatch = liContent.match(/<a[^>]*title=["']map link["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    const mapLink = mapLinkMatch ? mapLinkMatch[1] : null;
    
    // Extract address from visually-hidden span inside map link
    let address = '';
    // First try to get address from visually-hidden span (most reliable)
    const visuallyHiddenMatch = liContent.match(/<span class="visually-hidden">([^<]+)<\/span>/i);
    if (visuallyHiddenMatch) {
      address = cleanHTML(visuallyHiddenMatch[1]);
    } else {
      // Fallback: try parentheses
      const addressMatch = liContent.match(/\(([^)]+)\)/);
      if (addressMatch) {
        address = addressMatch[1];
      } else if (mapLink) {
        // Last resort: try to extract from Google Maps URL
        const mapsMatch = mapLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (mapsMatch) {
          address = venue || 'Address available via map';
        }
      }
    }
    
    // Extract time from <span class="text-gray">[time]</span> or just [time]
    let time = null;
    const timeSpanMatch = liContent.match(/<span[^>]*class=["'][^"']*text-gray[^"']*["'][^>]*>\[([^\]]+)\]<\/span>/i);
    if (timeSpanMatch) {
      time = timeSpanMatch[1].trim();
    } else {
      // Fallback: try to find [time] anywhere
      const timeMatch = liContent.match(/\[([^\]]+)\]/);
      if (timeMatch) {
        time = timeMatch[1].trim();
      }
    }
    
    // Handle canceled/postponed shows
    const isCanceled = /canceled|cancelled|closed|postponed/i.test(liContent);
    if (isCanceled && !artist) {
      return null; // Skip canceled shows without artist info
    }
    
    if (!artist || !venue) {
      return null; // Skip if essential info missing
    }
    
    return {
      artist: artist.trim(),
      venue: venue.trim(),
      address: address.trim() || venue.trim(),
      eventLink: eventLink || null,
      venueLink: venueLink || null,
      mapLink: mapLink || null,
      time: time ? time.trim() : null,
    };
  } catch (error) {
    console.error('Error parsing show:', error, liContent);
    return null;
  }
}

/**
 * Clean HTML tags and entities from text
 */
function cleanHTML(html) {
  if (!html) return '';
  
  return html
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
