const {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  demuxProbe,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const { execFile } = require('node:child_process');
const path = require('node:path');
const { Readable } = require('node:stream');
const { promisify } = require('node:util');
const play = require('play-dl');
const {
  extractSpotifyResourceInfo,
  resolveSpotifyInput,
  resolveSpotifyTrack
} = require('./spotifyService');

const queues = new Map();
const DISCONNECT_DELAY_MS = 2 * 60 * 1000;
const VOICE_READY_TIMEOUT_MS = 45_000;
const YT_DLP_PYTHON = path.join(process.cwd(), '.venv', 'bin', 'python');
const execFileAsync = promisify(execFile);

function getOrCreateQueue(guildId) {
  let queue = queues.get(guildId);

  if (queue) {
    return queue;
  }

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause
    }
  });

  queue = {
    guildId,
    connection: null,
    player,
    voiceChannelId: null,
    textChannelId: null,
    songs: [],
    current: null,
    state: 'idle',
    disconnectTimer: null,
    autoplay: false,
    pendingPlayerAction: null,
    autoplayLoading: false,
    loopMode: 'off',
    shuffleMode: false
  };

  player.on(AudioPlayerStatus.Idle, () => {
    console.log(`[music:${guildId}] player -> idle`);
    void handleTrackEnded(guildId);
  });

  player.on(AudioPlayerStatus.Buffering, () => {
    console.log(`[music:${guildId}] player -> buffering`);
  });

  player.on(AudioPlayerStatus.Playing, () => {
    console.log(`[music:${guildId}] player -> playing`);
  });

  player.on(AudioPlayerStatus.Paused, () => {
    console.log(`[music:${guildId}] player -> paused`);
  });

  player.on('error', (error) => {
    console.error(`Audio player error di guild ${guildId}:`, error);
    void handleTrackEnded(guildId, { skipCurrent: true });
  });

  queues.set(guildId, queue);
  return queue;
}

async function enqueueMusic(interaction, input) {
  if (!interaction.guild) {
    throw new Error('Command ini hanya bisa dipakai di server.');
  }

  const memberVoiceChannel = interaction.member?.voice?.channel;
  if (!memberVoiceChannel) {
    throw new Error('Kamu harus join voice channel dulu sebelum memakai /play.');
  }

  const queue = getOrCreateQueue(interaction.guild.id);

  if (queue.voiceChannelId && queue.voiceChannelId !== memberVoiceChannel.id) {
    throw new Error(`Bot sedang dipakai di voice channel lain: <#${queue.voiceChannelId}>.`);
  }

  queue.textChannelId = interaction.channelId;
  queue.client = interaction.client;

  const resolved = await resolveInputItems(input);
  queue.songs.push(...resolved.items);

  await ensureConnection(interaction, queue, memberVoiceChannel);
  clearDisconnectTimer(queue);

  if (queue.state === 'idle') {
    await playNextTrack(queue.guildId);
  }

  return {
    resolved,
    queue
  };
}

async function joinMusic(interaction) {
  if (!interaction.guild) {
    throw new Error('Command ini hanya bisa dipakai di server.');
  }

  const memberVoiceChannel = interaction.member?.voice?.channel;
  if (!memberVoiceChannel) {
    throw new Error('Kamu harus join voice channel dulu sebelum memakai /join.');
  }

  const queue = getOrCreateQueue(interaction.guild.id);

  if (queue.voiceChannelId && queue.voiceChannelId !== memberVoiceChannel.id) {
    throw new Error(`Bot sedang dipakai di voice channel lain: <#${queue.voiceChannelId}>.`);
  }

  queue.textChannelId = interaction.channelId;
  queue.client = interaction.client;
  await ensureConnection(interaction, queue, memberVoiceChannel);
  clearDisconnectTimer(queue);

  return queue;
}

async function resolveInputItems(input) {
  const spotifyInfo = extractSpotifyResourceInfo(input);

  if (spotifyInfo) {
    const resolved = await resolveSpotifyInput(input);
    const collectionId = `${spotifyInfo.type}:${spotifyInfo.id}`;
    return {
      sourceType: resolved.type,
      title: resolved.title,
      artist: resolved.artist,
      thumbnailUrl: resolved.thumbnailUrl,
      items: resolved.items.map((item, index) => ({
        ...item,
        collectionId: spotifyInfo.type === 'playlist' ? collectionId : null,
        collectionIndex: index
      }))
    };
  }

  const youtubeInfo = extractYouTubeResourceInfo(input);

  if (youtubeInfo) {
    return {
      sourceType: 'youtube-url',
      title: youtubeInfo.url,
      artist: null,
      thumbnailUrl: null,
      items: [
        {
          kind: 'youtube-url',
          url: youtubeInfo.url
        }
      ]
    };
  }

  return {
    sourceType: 'search',
    title: input,
    artist: null,
    thumbnailUrl: null,
    items: [
      {
        kind: 'youtube-search',
        query: input
      }
    ]
  };
}

async function ensureConnection(interaction, queue, memberVoiceChannel) {
  if (queue.connection && queue.voiceChannelId === memberVoiceChannel.id) {
    if (queue.connection.state.status === VoiceConnectionStatus.Destroyed) {
      queue.connection = null;
    } else {
      console.log(`[music:${queue.guildId}] reuse existing connection -> ${queue.connection.state.status}`);
      queue.connection.subscribe(queue.player);
      console.log(`[music:${queue.guildId}] player subscribed to existing voice connection`);
      await waitForVoiceConnectionReady(queue.connection, queue.guildId);
      return queue.connection;
    }
  }

  const connection = joinVoiceChannel({
    channelId: memberVoiceChannel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    // Jangan self-deaf agar handshake voice dan pengiriman audio konsisten.
    selfDeaf: false,
    debug: true
  });

  queue.connection = connection;
  queue.voiceChannelId = memberVoiceChannel.id;
  queue.voiceJoinStartedAt = Date.now();
  connection.subscribe(queue.player);
  console.log(`[music:${queue.guildId}] player subscribed to new voice connection`);

  connection.on('error', (error) => {
    console.error(`[music:${queue.guildId}] connection error:`, error);
  });

  connection.on('close', (code) => {
    console.log(`[music:${queue.guildId}] connection close -> ${code}`);
  });

  connection.on('debug', (message) => {
    console.log(`[music:${queue.guildId}] voice debug: ${message}`);
  });

  connection.on('stateChange', (_oldState, newState) => {
    console.log(`[music:${queue.guildId}] connection -> ${newState.status} (+${getVoiceElapsedMs(queue)}ms)`);
    if (newState.status === VoiceConnectionStatus.Disconnected) {
      resetQueue(queue, { destroyConnection: false });
    }
  });

  await waitForVoiceConnectionReady(connection, queue.guildId);
  return connection;
}

async function waitForVoiceConnectionReady(connection, guildId) {
  if (connection.state.status === VoiceConnectionStatus.Ready) {
    console.log(`[music:${guildId}] connection already ready`);
    return connection;
  }

  console.log(`[music:${guildId}] waiting connection ready, current=${connection.state.status}`);
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_TIMEOUT_MS);
  } catch (error) {
    console.error(`[music:${guildId}] connection gagal ready, status terakhir=${connection.state.status}:`, error);
    try {
      connection.destroy();
    } catch (destroyError) {
      console.error(`[music:${guildId}] gagal destroy connection lama:`, destroyError);
    }
    throw error;
  }
  console.log(`[music:${guildId}] connection ready -> ${connection.state.status}`);
  return connection;
}

function getVoiceElapsedMs(queue) {
  if (!queue?.voiceJoinStartedAt) {
    return 0;
  }

  return Date.now() - queue.voiceJoinStartedAt;
}

async function playNextTrack(guildId) {
  const queue = queues.get(guildId);
  if (!queue || queue.state !== 'idle' || queue.songs.length === 0) {
    if (queue && queue.songs.length === 0) {
      scheduleDisconnectCleanup(guildId);
    }

    return;
  }

  queue.state = 'loading';

  const currentItem = queue.songs[0];

  try {
    const playback = await resolvePlaybackItem(currentItem);
    const streamUrl = await resolveYouTubeAudioUrl(playback.youtube.url);
    const response = await fetch(streamUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok || !response.body) {
      throw new Error(`Gagal mengambil audio stream: HTTP ${response.status}`);
    }

    const rawStream = Readable.fromWeb(response.body);
    const probe = await demuxProbe(rawStream);
    const resource = createAudioResource(probe.stream, {
      inputType: probe.type
    });

    console.log(
      `[music:${guildId}] resource siap -> ${playback.title} | type=${probe.type} | content-type=${response.headers.get('content-type') || 'unknown'}`
    );

    queue.current = {
      ...currentItem,
      playback
    };
    queue.state = 'playing';
    queue.player.play(resource);
    console.log(`[music:${guildId}] queue.player.play() dipanggil untuk ${playback.title}`);

    // Send now-playing embed
    await sendNowPlayingMessage(queue, playback);
  } catch (error) {
    console.error(`Gagal memutar item di guild ${guildId}:`, error);
    queue.state = 'idle';
    queue.songs.shift();
    await playNextTrack(guildId);
  }
}

async function resolvePlaybackItem(item) {
  if (item.kind === 'spotify-track') {
    const track = await resolveSpotifyTrack(item.spotifyUrl);
    const video = await searchYouTubeTrack(track.youtubeSearchQuery);

    return {
      sourceType: 'spotify',
      title: track.title,
      artist: track.artist,
      sourceUrl: track.trackUrl,
      thumbnailUrl: track.thumbnailUrl || video.thumbnailUrl,
      youtube: video,
      url: video.url
    };
  }

  if (item.kind === 'youtube-search') {
    const video = await searchYouTubeTrack(item.query);

    return {
      sourceType: 'youtube',
      title: video.title,
      artist: video.channelName || null,
      sourceUrl: video.url,
      thumbnailUrl: video.thumbnailUrl,
      youtube: video,
      url: video.url
    };
  }

  if (item.kind === 'youtube-url') {
    const video = await getYouTubeVideoInfo(item.url);

    return {
      sourceType: 'youtube',
      title: video.title,
      artist: video.channelName || null,
      sourceUrl: video.url,
      thumbnailUrl: video.thumbnailUrl,
      youtube: video,
      url: video.url
    };
  }

  throw new Error(`Item queue tidak dikenal: ${item.kind}`);
}

async function resolveYouTubeAudioUrl(youtubeUrl) {
  if (!youtubeUrl || typeof youtubeUrl !== 'string') {
    throw new Error('URL YouTube tidak valid.');
  }

  const pythonPath = getPythonExecutablePath();
  const { stdout } = await execFileAsync(
    pythonPath,
    [
      '-m',
      'yt_dlp',
      '--no-warnings',
      '--quiet',
      '-f',
      'ba[ext=webm]/ba',
      '-g',
      youtubeUrl
    ],
    {
      encoding: 'utf8'
    }
  );

  const streamUrl = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!streamUrl) {
    throw new Error('Gagal mendapatkan direct audio URL dari YouTube.');
  }

  return streamUrl;
}

function getPythonExecutablePath() {
  try {
    return require('node:fs').existsSync(YT_DLP_PYTHON) ? YT_DLP_PYTHON : 'python3';
  } catch (error) {
    return 'python3';
  }
}

async function searchYouTubeTrack(query) {
  const results = await play.search(query, { limit: 1 });

  if (!results || results.length === 0) {
    throw new Error(`Tidak ada hasil YouTube untuk query: ${query}`);
  }

  const video = results[0];

  return {
    title: video.title || 'Unknown title',
    url: video.url,
    channelName: video.channel?.name || null,
    thumbnailUrl: Array.isArray(video.thumbnails) && video.thumbnails.length > 0
      ? video.thumbnails[0]?.url || null
      : null,
    durationInSec: video.durationInSec || null
  };
}

function extractYouTubeResourceInfo(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  if (play.yt_validate(trimmed) !== 'video') {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const videoId = url.searchParams.get('v');

    if (videoId) {
      return { url: `https://www.youtube.com/watch?v=${videoId}` };
    }

    if (url.hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (id) {
        return { url: `https://www.youtube.com/watch?v=${id}` };
      }
    }
  } catch (error) {
    return null;
  }

  return { url: trimmed };
}

async function getYouTubeVideoInfo(youtubeUrl) {
  const info = await play.video_basic_info(youtubeUrl);
  const details = info.video_details;

  return {
    title: details?.title || 'Unknown title',
    url: details?.url || youtubeUrl,
    channelName: details?.channel?.name || null,
    thumbnailUrl: details?.thumbnails?.[0]?.url || null,
    durationInSec: details?.durationInSec || null
  };
}

async function handleTrackEnded(guildId, options = {}) {
  const queue = queues.get(guildId);
  if (!queue) {
    return;
  }

  const previousPlayback = queue.current?.playback;

  if (queue.pendingPlayerAction) {
    const action = queue.pendingPlayerAction;
    queue.pendingPlayerAction = null;
    queue.current = null;
    queue.state = 'idle';

    if (action === 'stop' || action === 'disconnect') {
      return;
    }

    if (action === 'skip') {
      if (queue.songs.length === 0) {
        await startAutoplay(queue, previousPlayback);
      } else {
        await playNextTrack(guildId);
      }
      return;
    }
  }

  // Handle loop-one: replay lagu yang sama
  if (queue.loopMode === 'one' && !options.skipCurrent) {
    queue.current = null;
    queue.state = 'idle';
    await playNextTrack(guildId);
    return;
  }

  if (options.skipCurrent || queue.songs.length > 0) {
    queue.songs.shift();
  }

  queue.current = null;
  queue.state = 'idle';

  if (queue.songs.length === 0) {
    // Handle loop-all: jika queue kosong tapi loopMode all, jangan autoplay
    if (queue.loopMode === 'all') {
      scheduleDisconnectCleanup(queue.guildId);
      return;
    }
    await startAutoplay(queue, previousPlayback);
    return;
  }

  await playNextTrack(guildId);
}

async function skipTrack(guildId) {
  const queue = queues.get(guildId);
  if (!queue || !queue.current || queue.state === 'loading') {
    return { ok: false, message: 'Tidak ada lagu yang sedang diputar.' };
  }

  // Jika loop mode 'one', tambah lagu saat ini kembali ke awal queue
  if (queue.loopMode === 'one' && queue.current) {
    queue.songs.unshift(queue.current);
  } else {
    // Normal skip: hapus lagu berikutnya dari queue
    queue.songs.shift();
  }

  queue.pendingPlayerAction = 'skip';
  queue.player.stop(true);
  return { ok: true, message: 'Lagu dilewati.' };
}

function stopMusic(guildId) {
  const queue = queues.get(guildId);
  if (!queue || (!queue.current && queue.songs.length === 0)) {
    return { ok: false, message: 'Tidak ada musik yang sedang berjalan.' };
  }

  queue.songs = [];
  queue.current = null;
  queue.state = 'idle';
  queue.pendingPlayerAction = 'stop';
  queue.player.stop(true);
  return { ok: true, message: 'Musik dihentikan dan queue dikosongkan.' };
}

function clearQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue) {
    return { ok: false, message: 'Queue belum dibuat.' };
  }

  const removedCount = Math.max(queue.songs.length - (queue.current ? 1 : 0), 0);
  queue.songs = queue.current ? [queue.songs[0]] : [];
  return {
    ok: true,
    message: removedCount > 0
      ? `${removedCount} lagu dihapus dari queue. Lagu yang sedang diputar tetap berjalan.`
      : 'Queue sudah kosong. Lagu yang sedang diputar tetap berjalan.'
  };
}

function disconnectMusic(guildId) {
  const queue = queues.get(guildId);
  if (!queue) {
    return { ok: false, message: 'Bot tidak sedang berada di voice channel.' };
  }

  resetQueue(queue, { destroyConnection: true });
  queues.delete(guildId);
  return { ok: true, message: 'Bot keluar dari voice channel dan queue di-reset.' };
}

function setAutoplay(guildId, enabled) {
  const queue = getOrCreateQueue(guildId);
  queue.autoplay = enabled;
  return queue.autoplay;
}

function setLoopMode(guildId, mode) {
  if (!['off', 'all', 'one'].includes(mode)) {
    return { ok: false, message: 'Mode loop tidak valid. Gunakan: off, all, atau one.' };
  }

  const queue = getOrCreateQueue(guildId);
  queue.loopMode = mode;

  const modeLabel = {
    off: 'Loop dimatikan',
    all: 'Loop seluruh queue diaktifkan',
    one: 'Loop lagu saat ini diaktifkan'
  };

  return { ok: true, message: modeLabel[mode] };
}

function toggleLoopMode(guildId) {
  const queue = getOrCreateQueue(guildId);
  const modes = ['off', 'one', 'all'];
  const currentIndex = modes.indexOf(queue.loopMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  queue.loopMode = modes[nextIndex];

  const modeLabel = {
    off: 'Loop dimatikan',
    all: 'Loop seluruh queue',
    one: 'Loop lagu saat ini'
  };

  return { ok: true, message: modeLabel[queue.loopMode], mode: queue.loopMode };
}

function resetQueue(queue, { destroyConnection }) {
  clearDisconnectTimer(queue);
  queue.songs = [];
  queue.current = null;
  queue.state = 'idle';
  queue.autoplayLoading = false;
  queue.pendingPlayerAction = destroyConnection ? 'disconnect' : 'stop';
  queue.player.stop(true);

  if (destroyConnection && queue.connection) {
    // First gracefully disconnect, then destroy
    if (queue.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      try {
        queue.connection.disconnect();
        queue.connection.destroy();
      } catch (error) {
        console.error(`[music:${queue.guildId}] error destroying connection:`, error);
      }
    }
  }

  queue.connection = null;
  queue.voiceChannelId = null;
}

async function startAutoplay(queue, previous) {
  if (!queue.autoplay || queue.autoplayLoading || !previous) {
    scheduleDisconnectCleanup(queue.guildId);
    return;
  }

  queue.autoplayLoading = true;

  try {
    let candidates = [];
    const artist = previous.artist || null;
    const title = previous.title || null;

    // Priority 1: Cari lagu dari artist yang sama
    if (artist && artist !== 'null' && artist !== 'Unknown artist') {
      try {
        const artistResults = await play.search(artist, { limit: 15 });
        candidates = artistResults.filter(
          (video) => video?.url && video.url !== previous.youtube?.url
        );
        if (candidates.length > 0) {
          console.log(`[music:${queue.guildId}] autoplay: ditemukan ${candidates.length} lagu dari artist ${artist}`);
        }
      } catch (error) {
        console.log(`[music:${queue.guildId}] artist search gagal, fallback ke combined search`);
      }
    }

    // Priority 2: Jika hasil artist terbatas, cari dengan artist + title
    if (candidates.length < 3) {
      try {
        const combinedQuery = [artist, title].filter(
          (term) => term && term !== 'null' && term !== 'Unknown artist' && term !== 'Unknown title'
        ).join(' ');
        const combinedResults = await play.search(`${combinedQuery} music`, { limit: 12 });
        candidates = combinedResults.filter(
          (video) => video?.url && video.url !== previous.youtube?.url
        );
        if (candidates.length > 0) {
          console.log(`[music:${queue.guildId}] autoplay: ditemukan ${candidates.length} lagu untuk ${combinedQuery}`);
        }
      } catch (error) {
        console.log(`[music:${queue.guildId}] combined search gagal`);
      }
    }

    if (candidates.length === 0) {
      throw new Error('Tidak ada kandidat autoplay yang ditemukan.');
    }

    const video = candidates[Math.floor(Math.random() * candidates.length)];
    queue.songs.push({ kind: 'youtube-url', url: video.url });
    queue.autoplayLoading = false;
    await playNextTrack(queue.guildId);
  } catch (error) {
    queue.autoplayLoading = false;
    console.error(`[music:${queue.guildId}] autoplay gagal:`, error.message);
    scheduleDisconnectCleanup(queue.guildId);
  }
}

function scheduleDisconnectCleanup(guildId) {
  const queue = queues.get(guildId);
  if (!queue || queue.disconnectTimer || queue.songs.length > 0) {
    return;
  }

  queue.disconnectTimer = setTimeout(() => {
    const latestQueue = queues.get(guildId);
    if (!latestQueue) {
      return;
    }

    if (latestQueue.songs.length === 0 && latestQueue.connection) {
      latestQueue.connection.destroy();
    }

    queues.delete(guildId);
  }, DISCONNECT_DELAY_MS);
}

function clearDisconnectTimer(queue) {
  if (queue.disconnectTimer) {
    clearTimeout(queue.disconnectTimer);
    queue.disconnectTimer = null;
  }
}

function buildQueueStatus(queue, resolved) {
  const addedCount = resolved.items.length;
  const totalCount = queue.songs.length;
  const collectionLabel = resolved.sourceType === 'track'
    ? `${resolved.title}${resolved.artist ? ` - ${resolved.artist}` : ''}`
    : `${resolved.title} (${addedCount} track${addedCount > 1 ? 's' : ''})`;

  return {
    addedCount,
    totalCount,
    collectionLabel
  };
}

async function sendNowPlayingMessage(queue, playback) {
  if (!queue.client || !queue.textChannelId) {
    return;
  }

  try {
    const channel = await queue.client.channels.fetch(queue.textChannelId);
    if (!channel || !channel.isTextBased()) {
      return;
    }

    const embed = buildNowPlayingEmbed(playback);
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`[music:${queue.guildId}] gagal send now-playing message:`, error);
  }
}

function buildNowPlayingEmbed(playback) {
  const duration = playback.youtube?.durationInSec
    ? formatDuration(playback.youtube.durationInSec)
    : 'Unknown';

  const embed = new EmbedBuilder()
    .setColor(0x1db954)
    .setTitle('▶️ Sedang Memutar')
    .setDescription(`**${playback.title}**`)
    .addFields(
      { name: 'Penyanyi', value: playback.artist || 'Unknown', inline: true },
      { name: 'Durasi', value: duration, inline: true },
      { name: 'Sumber', value: formatSource(playback.sourceType), inline: true }
    );

  if (playback.thumbnailUrl) {
    embed.setThumbnail(playback.thumbnailUrl);
  }

  return embed;
}

function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatSource(sourceType) {
  if (sourceType === 'spotify') return 'Spotify';
  if (sourceType === 'youtube') return 'YouTube';
  return 'Unknown';
}

function shuffleArray(array) {
  // Fisher-Yates shuffle algorithm
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function setShuffle(guildId, enabled) {
  const queue = getOrCreateQueue(guildId);
  queue.shuffleMode = enabled;
  
  // Jika enabled true dan ada lagu di queue, shuffle langsung
  if (enabled && queue.songs.length > 0) {
    shuffleArray(queue.songs);
    console.log(`[music:${guildId}] queue di-shuffle, total ${queue.songs.length} lagu`);
  }
  
  return { ok: true, message: enabled ? '🔀 Shuffle mode diaktifkan' : '🔀 Shuffle mode dimatikan' };
}

function toggleShuffle(guildId) {
  const queue = getOrCreateQueue(guildId);
  queue.shuffleMode = !queue.shuffleMode;
  
  // Jika toggle menjadi true dan ada lagu di queue, shuffle langsung
  if (queue.shuffleMode && queue.songs.length > 0) {
    shuffleArray(queue.songs);
    console.log(`[music:${guildId}] queue di-shuffle, total ${queue.songs.length} lagu`);
  }
  
  return { ok: true, message: queue.shuffleMode ? '🔀 Shuffle mode diaktifkan' : '🔀 Shuffle mode dimatikan' };
}

module.exports = {
  buildQueueStatus,
  clearQueue,
  disconnectMusic,
  enqueueMusic,
  extractYouTubeResourceInfo,
  getOrCreateQueue,
  getYouTubeVideoInfo,
  joinMusic,
  playNextTrack,
  resolvePlaybackItem,
  resolveYouTubeAudioUrl,
  searchYouTubeTrack,
  setAutoplay,
  setLoopMode,
  setShuffle,
  skipTrack,
  stopMusic,
  toggleLoopMode,
  toggleShuffle
};
