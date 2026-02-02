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

      // GET /api/artist-genre?artist=...: MusicBrainz + Gemini fallback for artist genres (cached)
      if (pathname.includes('artist-genre')) {
        const artistParam = url.searchParams.get('artist');
        if (!artistParam || !artistParam.trim()) {
          return new Response(
            JSON.stringify({ error: 'Missing query parameter: artist' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }
        const artistName = artistParam.trim();
        const cacheRequest = new Request(url.toString(), { method: 'GET' });
        const cached = await caches.default.match(cacheRequest);
        if (cached) {
          return new Response(cached.body, { headers: cached.headers });
        }
        let result = await fetchMusicBrainzTags(artistName);
        if ((!result.genres || result.genres.length === 0) && env.GEMINI_API_KEY) {
          const geminiResult = await fetchGeminiArtistInfo(artistName, env.GEMINI_API_KEY);
          if (geminiResult) result = geminiResult;
        }
        const body = JSON.stringify(result);
        const response = new Response(body, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=604800',
          },
        });
        await caches.default.put(cacheRequest, response.clone());
        return response;
      }

      // GET /api/event-description?artist=...&venue=...: Gemini-generated artist + venue description (cached)
      if (pathname.includes('event-description')) {
        const artistParam = url.searchParams.get('artist');
        const venueParam = url.searchParams.get('venue');
        if (!artistParam || !artistParam.trim()) {
          return new Response(
            JSON.stringify({ error: 'Missing query parameter: artist' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }
        const artistName = artistParam.trim();
        const venueName = (venueParam && venueParam.trim()) || 'this venue';
        const cacheRequest = new Request(url.toString(), { method: 'GET' });
        const cached = await caches.default.match(cacheRequest);
        if (cached) {
          return new Response(cached.body, { headers: cached.headers });
        }
        let result = { description: '', artistDescription: '', venueDescription: '' };
        if (env.GEMINI_API_KEY) {
          const geminiResult = await fetchEventDescription(artistName, venueName, env.GEMINI_API_KEY);
          if (geminiResult) result = geminiResult;
        }
        const body = JSON.stringify(result);
        const response = new Response(body, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=604800',
          },
        });
        await caches.default.put(cacheRequest, response.clone());
        return response;
      }

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

const MB_USER_AGENT = 'ShowlistApp/1.0 (https://showlists.net)';

/**
 * Fetch artist tags (genres) from MusicBrainz. Returns { artist, genres: string[], source: 'musicbrainz' }.
 * Rate limit: 1 req/sec - we do one search + one artist lookup per request.
 */
async function fetchMusicBrainzTags(artistName) {
  const out = { artist: artistName, genres: [], source: 'musicbrainz' };
  try {
    const searchUrl = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artistName)}&fmt=json&limit=1`;
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': MB_USER_AGENT } });
    if (!searchRes.ok) return out;
    const searchData = await searchRes.json();
    const artists = searchData.artists;
    if (!artists || artists.length === 0) return out;
    const mbid = artists[0].id;
    const artistUrl = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=tags&fmt=json`;
    const artistRes = await fetch(artistUrl, { headers: { 'User-Agent': MB_USER_AGENT } });
    if (!artistRes.ok) return out;
    const artistData = await artistRes.json();
    const tags = artistData.tags || [];
    const filtered = tags
      .filter((t) => t.name && !/seen live|favorites?|to see|various|unknown/i.test(t.name))
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 8)
      .map((t) => t.name.trim());
    out.genres = filtered;
  } catch (e) {
    console.error('MusicBrainz fetch error:', e);
  }
  return out;
}

/**
 * Call Google Gemini for artist genre/mood/energy. Returns { artist, genres, mood, energy, similarTo, source: 'gemini' } or null.
 * Uses a rich prompt to improve recommendations: genres, mood, energy 1-5, similar artists.
 */
async function fetchGeminiArtistInfo(artistName, apiKey) {
  const prompt = `You are helping a live-music recommendation app. For the artist "${artistName}", respond with ONLY valid JSON (no markdown, no code block, no other text). Use this exact structure:
{"genres":["genre1","genre2","genre3"],"mood":"one word","energy":3,"similarTo":["Similar Artist 1","Similar Artist 2"]}
Rules: genres = 2-4 music genres or styles (e.g. rock, indie, soul, jazz). mood = one of: chill, upbeat, intense, romantic, party, contemplative, other. energy = number 1-5 (1=low/quiet, 5=high/intense). similarTo = 0-2 similar artist names. If the artist is unknown or not music, set genres to [] and mood to "other".`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 256, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) {
      console.error('Gemini API error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const raw = text.replace(/^```\w*\n?|\n?```$/g, '').trim();
    const parsed = JSON.parse(raw);
    return {
      artist: artistName,
      genres: Array.isArray(parsed.genres) ? parsed.genres.slice(0, 6) : [],
      mood: typeof parsed.mood === 'string' ? parsed.mood : 'other',
      energy: typeof parsed.energy === 'number' && parsed.energy >= 1 && parsed.energy <= 5 ? parsed.energy : 3,
      similarTo: Array.isArray(parsed.similarTo) ? parsed.similarTo.slice(0, 2) : [],
      source: 'gemini',
    };
  } catch (e) {
    console.error('Gemini fetch error:', e);
    return null;
  }
}

/**
 * Call Google Gemini for a full event description (artist + venue together).
 * Returns { description: string, artistDescription?: string, venueDescription?: string } or null.
 */
async function fetchEventDescription(artistName, venueName, apiKey) {
  const prompt = `You are helping a live-music app. A user is viewing an event: "${artistName}" at "${venueName}".

Write a short, engaging event description for someone deciding whether to go. Respond with ONLY valid JSON (no markdown, no code block, no other text). Use this exact structure:
{"description":"One cohesive paragraph (3-5 sentences) that describes this show: who the artist is, their sound or vibe, what to expect at a live set, and what the venue is like—atmosphere, crowd, why it's a good spot for this show. Write in a friendly, informative tone.","artistDescription":"2-3 sentences focused only on the artist: style, vibe, what to expect live.","venueDescription":"1-2 sentences focused only on the venue: atmosphere, typical crowd, what makes it notable."}

If the artist or venue is obscure or unknown, give a brief, honest line rather than inventing facts. Keep everything concise and useful.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 768, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) {
      console.error('Gemini event-description error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const raw = text.replace(/^```\w*\n?|\n?```$/g, '').trim();
    const parsed = JSON.parse(raw);
    return {
      description: typeof parsed.description === 'string' ? parsed.description : '',
      artistDescription: typeof parsed.artistDescription === 'string' ? parsed.artistDescription : '',
      venueDescription: typeof parsed.venueDescription === 'string' ? parsed.venueDescription : '',
    };
  } catch (e) {
    console.error('Gemini event-description fetch error:', e);
    return null;
  }
}

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
