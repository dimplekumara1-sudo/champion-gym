/**
 * Video URL Utilities
 * Provides functions for YouTube URL conversion and iframe embedding
 */

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export const getYoutubeId = (url: string): string | null => {
    if (!url) return null;

    try {
        // Handle youtube.com/watch?v=
        if (url.includes('youtube.com/watch?v=')) {
            return url.split('v=')[1].split('&')[0];
        }
        // Handle youtu.be/
        if (url.includes('youtu.be/')) {
            return url.split('youtu.be/')[1].split('?')[0].split('&')[0];
        }
        // Handle direct embed URLs
        if (url.includes('youtube.com/embed/')) {
            const parts = url.split('youtube.com/embed/')[1];
            return parts.split('?')[0].split('&')[0];
        }
        // Fallback regex pattern
        const matches = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        return matches?.[1] || null;
    } catch {
        return null;
    }
};

/**
 * Convert any YouTube URL to embed URL
 */
export const convertToEmbedUrl = (url: string, autoplay = false): string | null => {
    const videoId = getYoutubeId(url);
    if (!videoId) return null;

    const params = new URLSearchParams();
    params.append('controls', '1');
    params.append('fs', '1');
    params.append('modestbranding', '1');
    if (autoplay) params.append('autoplay', '1');

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

/**
 * Check if URL is a YouTube URL
 */
export const isYoutubeUrl = (url: string): boolean => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
};

/**
 * Get YouTube thumbnail URL
 */
export const getYoutubeThumbnail = (url: string): string | null => {
    const videoId = getYoutubeId(url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Fallback thumbnail if maxres not available
 */
export const getYoutubeThumbnailFallback = (url: string): string | null => {
    const videoId = getYoutubeId(url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};
