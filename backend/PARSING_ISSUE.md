# HTML Parsing Issue - Debugging Notes

## Current Status
The Cloudflare Worker is deployed and responding, but the HTML parser is not extracting shows correctly. All date entries are being found, but shows arrays are empty.

## HTML Structure Analysis
From testing, the actual HTML structure is:
```html
<h5 class="text-brand">Saturday, January 24th 2026</h5>
<ul>
  <li data-venue="Paramount Theater" class="showlist-item" data-show-id="1229550" data-show-date="20260124">
    <a href="https://tickets.austintheatre.org/12788" title="show link" ...>
      Chris Thile
    </a>
    at
    <a class="venue-title ..." title="venue link" ...>
      Paramount Theater
    </a>
    <a class="text-brand maps-link ..." href="https://goo.gl/maps/..." title="map link" ...>
      <span class="visually-hidden">713 Congress</span>
      <svg>...</svg>
    </a>
    <span class="text-gray">
      [10:00 pm]
    </span>
  </li>
</ul>
```

## Potential Issues
1. Regex might not be matching due to multiline content
2. Quote styles (single vs double) in attributes
3. Whitespace/newlines in HTML
4. The `<ul>` extraction might be failing

## Next Steps to Debug
1. Check worker logs: `wrangler tail`
2. Add console.log statements to see what's being parsed
3. Test regex patterns locally with actual HTML
4. Consider using HTMLRewriter API (Cloudflare's built-in HTML parser)

## Quick Test
To test if HTML is being fetched:
```bash
curl -s "https://showlist-proxy.aasim-ss.workers.dev/api/events" | jq '.events[0]'
```

## Alternative Approach
Consider using the `window.upcomingShows` JavaScript object that's embedded in the page - it contains structured data that might be easier to parse.
