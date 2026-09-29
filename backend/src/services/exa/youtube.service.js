import "dotenv/config"
import axios from 'axios';
import { calculateVideoScore, detectSearchIntent, formatDuration, generateYouTubeQuery, getMinViews, isLongFormVideo, parseDurationToSeconds } from '../../utils/youtube.utils.js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

export async function searchYouTubeVideos(query, topic = "general", maxResults = 20) {
    if (!YOUTUBE_API_KEY) {
        console.warn('YOUTUBE_API_KEY not found. YouTube search disabled.');
        return [];
    }

    try {
        const intent = detectSearchIntent(query);
        const searchQuery = query;

        const searchResponse = await axios.get(YOUTUBE_API_URL, {
            params: {
                part: 'snippet',
                q: searchQuery,
                maxResults: 15,
                type: 'video',
                key: YOUTUBE_API_KEY,
                order: 'relevance',
                videoEmbeddable: 'true',
                videoDuration: "any"
            },
            timeout: 5000
        });

        if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
            console.log(`No YouTube videos found for: "${query}"`);
            return [];
        }

        const videoIds = searchResponse.data.items.map(item => item.id.videoId).filter(id => id).join(',');

        if (!videoIds) return [];

        const videoDetailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
                part: 'statistics,contentDetails',
                id: videoIds,
                key: YOUTUBE_API_KEY
            }
        });

        const videoDetailsMap = {};
        videoDetailsResponse.data.items?.forEach((item) => {
            videoDetailsMap[item.id] = {
                statistics: item.statistics || {},
                contentDetails: item.contentDetails || {},
            };
        });

        let videos = searchResponse.data.items.map(item => {
            const details = videoDetailsMap[item.id.videoId] || {};
            const stats = details.statistics || {};
            const contentDetails = details.contentDetails || {};

            return {
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                views: parseInt(stats.viewCount || 0),
                likes: parseInt(stats.likeCount || 0),
                comments: parseInt(stats.commentCount || 0),
                publishedAt: item.snippet.publishedAt,
                thumbnail: item.snippet.thumbnails?.medium?.url || null,
                videoId: item.id.videoId,
                duration: contentDetails.duration || null,
                formattedDuration: formatDuration(contentDetails.duration),
                description: item.snippet.description || '',
                score: 0
            };
        });


        videos = videos.filter(video => isLongFormVideo(video));

        videos = videos.filter(video => video.views > 0);

        const minViews = getMinViews(videos, intent);
        videos = videos.filter(video => video.views >= minViews);


        videos = videos.map(video => ({
                ...video,
                score: calculateVideoScore(video, query, intent, topic) 
            })).sort((a, b) => b.score - a.score);

        const seenChannels = new Set();
        const deduped = [];

        for (const video of videos) {
            const channelKey = video.channel.toLowerCase();
            if (!seenChannels.has(channelKey)) {
                seenChannels.add(channelKey);
                deduped.push(video);
            }
        }

        const finalResults = deduped.slice(0, maxResults);
        return finalResults;

    } catch (error) {
        console.error('YouTube API error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        return [];
    }
}