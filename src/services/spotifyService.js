const https = require('node:https');

const SPOTIFY_OEMBED_BASE = 'https://open.spotify.com/oembed';

function extractSpotifyTrackId(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  const uriMatch = trimmed.match(/^spotify:track:([a-zA-Z0-9]+)$/);
  if (uriMatch) {
    return uriMatch[1];
  }

  const urlMatch = trimmed.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  return null;
}

function buildSpotifyTrackUrl(trackId) {
  return `https://open.spotify.com/track/${trackId}`;
}

function buildSpotifyAlbumUrl(albumId) {
  return `https://open.spotify.com/album/${albumId}`;
}

function buildSpotifyPlaylistUrl(playlistId) {
  return `https://open.spotify.com/playlist/${playlistId}`;
}

function extractSpotifyResourceInfo(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  const uriMatch = trimmed.match(/^spotify:(track|album|playlist):([a-zA-Z0-9]+)$/);
  if (uriMatch) {
    return {
      type: uriMatch[1],
      id: uriMatch[2],
      url: buildSpotifyResourceUrl(uriMatch[1], uriMatch[2])
    };
  }

  const urlMatch = trimmed.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return {
      type: urlMatch[1],
      id: urlMatch[2],
      url: buildSpotifyResourceUrl(urlMatch[1], urlMatch[2])
    };
  }

  return null;
}

function buildSpotifyResourceUrl(type, id) {
  if (type === 'track') {
    return buildSpotifyTrackUrl(id);
  }

  if (type === 'album') {
    return buildSpotifyAlbumUrl(id);
  }

  if (type === 'playlist') {
    return buildSpotifyPlaylistUrl(id);
  }

  return null;
}

function buildSpotifyResourceEmbedUrl(type, id) {
  const resourceUrl = buildSpotifyResourceUrl(type, id);

  if (!resourceUrl) {
    return null;
  }

  return resourceUrl.replace(
    'https://open.spotify.com/',
    'https://open.spotify.com/embed/'
  ) + '?utm_source=oembed';
}

function decodeHtmlEntities(text) {
  if (!text) return text;

  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function fetchSpotifyOEmbed(trackUrl) {
  const endpoint = `${SPOTIFY_OEMBED_BASE}?url=${encodeURIComponent(trackUrl)}`;

  return new Promise((resolve, reject) => {
    https
      .get(endpoint, (res) => {
        let body = '';

        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`Spotify oEmbed gagal dengan status ${res.statusCode}`));
          }

          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (error) {
            reject(new Error('Gagal membaca respons Spotify oEmbed.'));
          }
        });
      })
      .on('error', reject);
  });
}

async function fetchSpotifyEmbedMetadata(trackId) {
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=oembed`;

  const response = await fetch(embedUrl, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml'
    }
  });

  if (!response.ok) {
    throw new Error(`Spotify embed page gagal dibaca dengan status ${response.status}`);
  }

  const html = await response.text();
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i
  );

  if (!nextDataMatch) {
    return { title: null, artist: null };
  }

  let nextData;

  try {
    nextData = JSON.parse(nextDataMatch[1]);
  } catch (error) {
    return { title: null, artist: null };
  }

  const entity = nextData?.props?.pageProps?.state?.data?.entity || null;

  const title = entity?.title || entity?.name || null;
  const artist = Array.isArray(entity?.artists) && entity.artists.length > 0
    ? entity.artists[0]?.name || null
    : null;

  return {
    title,
    artist
  };
}

async function fetchSpotifyPageHtml(pageUrl) {
  const response = await fetch(pageUrl, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      accept: 'text/html,application/xhtml+xml'
    }
  });

  if (!response.ok) {
    throw new Error(`Spotify page gagal dibaca dengan status ${response.status}`);
  }

  return response.text();
}

function readSpotifyMeta(html, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta\\s+property="${escapedKey}"\\s+content="([^"]+)"\\s*/?>`, 'i'),
    new RegExp(`<meta\\s+name="${escapedKey}"\\s+content="([^"]+)"\\s*/?>`, 'i')
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return decodeHtmlEntities(match[1]).trim();
    }
  }

  return null;
}

function extractSpotifyTrackUrlsFromHtml(html) {
  const seen = new Set();
  const urls = [];
  const pattern = /https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/g;

  for (const match of html.matchAll(pattern)) {
    const trackId = match[1];
    if (seen.has(trackId)) continue;

    seen.add(trackId);
    urls.push(buildSpotifyTrackUrl(trackId));
  }

  return urls;
}

async function fetchSpotifyCollectionMetadata(collectionUrl) {
  const resource = extractSpotifyResourceInfo(collectionUrl);

  if (!resource || (resource.type !== 'album' && resource.type !== 'playlist')) {
    throw new Error('Input bukan Spotify album atau playlist yang valid.');
  }

  const embedUrl = buildSpotifyResourceEmbedUrl(resource.type, resource.id);
  const html = await fetchSpotifyPageHtml(embedUrl);

  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i
  );

  let entity = null;

  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      entity = nextData?.props?.pageProps?.state?.data?.entity || null;
    } catch (error) {
      entity = null;
    }
  }

  const title = entity?.title || entity?.name || readSpotifyMeta(html, 'og:title') || null;
  const description = entity?.subtitle || readSpotifyMeta(html, 'og:description') || null;
  const thumbnailUrl =
    entity?.visualIdentity?.backgroundImage?.sources?.[0]?.url
    || entity?.coverArt?.sources?.[0]?.url
    || readSpotifyMeta(html, 'og:image')
    || null;
  const type = entity?.type || readSpotifyMeta(html, 'og:type') || null;

  const trackList = Array.isArray(entity?.trackList) ? entity.trackList : [];
  const trackUrls = trackList
    .map((item) => item?.uri)
    .filter((uri) => typeof uri === 'string' && uri.startsWith('spotify:track:'))
    .map((uri) => buildSpotifyTrackUrl(uri.split(':').pop()));

  const fallbackTrackUrls = trackUrls.length > 0
    ? trackUrls
    : extractSpotifyTrackUrlsFromHtml(html);

  return {
    title,
    description,
    thumbnailUrl,
    type,
    trackUrls: fallbackTrackUrls
  };
}

async function resolveSpotifyTrack(input) {
  const trackId = extractSpotifyTrackId(input);

  if (!trackId) {
    throw new Error('Input bukan Spotify track URL atau URI yang valid.');
  }

  const trackUrl = buildSpotifyTrackUrl(trackId);
  const oembed = await fetchSpotifyOEmbed(trackUrl);
  let embedMetadata = null;

  if (!oembed.title || !oembed.author_name) {
    try {
      embedMetadata = await fetchSpotifyEmbedMetadata(trackId);
    } catch (error) {
      embedMetadata = null;
    }
  }

  const title = oembed.title || embedMetadata?.title || 'Unknown title';
  const artist = oembed.author_name || embedMetadata?.artist || 'Unknown artist';
  const thumbnailUrl = oembed.thumbnail_url || null;

  return {
    trackId,
    trackUrl,
    title,
    artist,
    thumbnailUrl,
    sourceName: oembed.provider_name || 'Spotify',
    youtubeSearchQuery: `${title} ${artist} audio`
  };
}

async function resolveSpotifyCollection(input) {
  const resource = extractSpotifyResourceInfo(input);

  if (!resource || (resource.type !== 'album' && resource.type !== 'playlist')) {
    throw new Error('Input bukan Spotify album atau playlist yang valid.');
  }

  const collection = await fetchSpotifyCollectionMetadata(resource.url);

  if (collection.trackUrls.length === 0) {
    throw new Error('Tidak ada track yang ditemukan pada album/playlist Spotify ini.');
  }

  return {
    type: resource.type,
    id: resource.id,
    url: resource.url,
    title: collection.title || 'Spotify Collection',
    description: collection.description || null,
    thumbnailUrl: collection.thumbnailUrl,
    trackUrls: collection.trackUrls
  };
}

async function resolveSpotifyInput(input) {
  const resource = extractSpotifyResourceInfo(input);

  if (!resource) {
    throw new Error('Input Spotify tidak valid.');
  }

  if (resource.type === 'track') {
    const track = await resolveSpotifyTrack(input);

    return {
      type: 'track',
      title: track.title,
      artist: track.artist,
      thumbnailUrl: track.thumbnailUrl,
      trackUrls: [track.trackUrl],
      items: [
        {
          kind: 'spotify-track',
          spotifyUrl: track.trackUrl
        }
      ]
    };
  }

  const collection = await resolveSpotifyCollection(input);

  return {
    type: resource.type,
    title: collection.title,
    artist: null,
    thumbnailUrl: collection.thumbnailUrl,
    trackUrls: collection.trackUrls,
    items: collection.trackUrls.map((spotifyUrl) => ({
      kind: 'spotify-track',
      spotifyUrl
    }))
  };
}

module.exports = {
  buildSpotifyTrackUrl,
  buildSpotifyAlbumUrl,
  buildSpotifyPlaylistUrl,
  buildSpotifyResourceUrl,
  extractSpotifyResourceInfo,
  extractSpotifyTrackId,
  extractSpotifyTrackUrlsFromHtml,
  fetchSpotifyOEmbed,
  fetchSpotifyCollectionMetadata,
  fetchSpotifyEmbedMetadata,
  fetchSpotifyPageHtml,
  readSpotifyMeta,
  resolveSpotifyCollection,
  resolveSpotifyInput,
  resolveSpotifyTrack
};
