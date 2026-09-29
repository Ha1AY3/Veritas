export function detectSearchIntent(query, topic = 'general') {
    const q = query.toLowerCase();

    if (q.includes('tutorial') || q.includes('learn') || q.includes('course') ||
        q.includes('how to') || q.includes('crash course') || q.includes('guide') ||
        q.includes('beginner') || q.includes('step by step') || q.includes('walkthrough')) {
        return 'tutorial';
    }

    const questionWords = ['what is', 'why is', 'how does', 'how do', 'when is', 'where is', 'who is', 'which is'];
    if (questionWords.some(word => q.includes(word))) {
        return 'explanation';
    }

    if (q.includes('explain') || q.includes('meaning') || q.includes('definition') ||
        q.includes('overview') || q.includes('introduction') || q.includes('basics') ||
        q.includes('concept') || q.includes('principles') || q.includes('fundamentals') ||
        q.includes('essentials') || q.includes('understand')) {
        return 'explanation';
    }

    if (q.includes(' vs ') || q.includes(' versus ') || q.includes('compared to') || q.includes('comparison')) {
        return 'comparison';
    }

    const documentaryTriggers = ['documentary', 'full documentary', 'documentary film', 'docu-series'];
    if (documentaryTriggers.some(word => q.includes(word))) {
        return 'documentary';
    }

    if (q.includes(' review') || q.includes('review of') || q.includes('unboxing') || q.includes('first impressions')) {
        return 'review';
    }

    if (q.includes('news') || q.includes('latest') || q.includes('recent') ||
        q.includes('update') || q.includes('current') || q.includes('today') ||
        q.includes('breaking') || q.includes('what\'s new')) {
        return 'news';
    }

    if (q.includes('lecture') || q.includes('academic') || q.includes('university') ||
        q.includes('professor') || q.includes('seminar') || q.includes('conference') ||
        q.includes('keynote')) {
        return 'lecture';
    }

    if (q.includes('interview') || q.includes('conversation') || q.includes('discussion') ||
        q.includes('podcast') || q.includes('talk') || q.includes('chat with')) {
        return 'interview';
    }

    if (q.includes('demo') || q.includes('demonstration') || q.includes('showcase')) {
        return 'demo';
    }

    if (topic === 'programming') {
        return 'tutorial';
    }

    if (topic === 'medical') {
        return 'explanation';
    }

    if (topic === 'history') {
        return 'documentary';
    }

    if (topic === 'science') {
        return 'explanation';
    }

    const wordCount = query.split(/\s+/).length;
    if (wordCount <= 2) {
        return 'general';
    }

    return 'general';
}

export function generateYouTubeQuery(query, intent) {
    const wordCount = query.split(/\s+/).length;
    const shouldAddExplained = wordCount <= 2;

    const intentMap = {
        tutorial: `${query} full tutorial for beginners`,
        explanation: `${query} explained simply`,
        comparison: `${query} comparison`,
        documentary: `${query} documentary`,
        review: `${query} review`,
        news: `${query} latest news`,
        lecture: `${query} lecture`,
        interview: `${query} interview`,
        demo: `${query} demo`,
        general: shouldAddExplained ? `${query} explained` : query
    };

    return intentMap[intent] || query;
}

export function calculateVideoScore(video, query, intent, topic = "general") {
    let score = 0;

    const q = query.toLowerCase();
    const title = video.title.toLowerCase();

    const titleWords = title.split(/\s+/);
    const queryWords = q.split(/\s+/);

    const relevance = queryWords.filter(word =>
        titleWords.some(t => t.includes(word))
    ).length;

    score += Math.min(relevance / Math.max(queryWords.length, 1), 1) * 40;

    const authorityChannels = [
        "freecodecamp",
        "academind",
        "traversymedia",
        "webdevsimplified",
        "fireship",
        "netninja",
        "programmingwithmosh",
        "csdojo",
        "sentdex",
        "techwithtim",

        "computerphile",
        "3blue1brown",
        "bytebytego",
        "deeplearning.ai",
        "codewithharry",
        "the primeagen",
        "techworld with nana",
        "nick chapsas",

        "google",
        "google developers",
        "microsoft",
        "amazon web services",
        "aws",
        "vercel",
        "prisma",
        "openai",
        "deepmind",

        "mit",
        "stanford",
        "harvard",
        "coursera",
        "edx",
        "khanacademy",

        "nature",
        "nasa",
        "bbc",
        "national geographic",
        "history",
        "ted",
        "who",
        "world health organization"
    ];

    const channelName = video.channel.toLowerCase();

    const isOfficial = authorityChannels.some(c =>
        channelName.includes(c)
    );

    if (isOfficial) score += 25;
    if (channelName.includes("official")) score += 8;
    if (/[A-Z]/.test(video.channel)) score += 3;

    const viewScore = Math.min(video.views / 50000, 1) * 15;
    const likeScore = Math.min(video.likes / 5000, 1) * 5;

    score += viewScore + likeScore;

    const daysSinceUpload =
        (Date.now() - new Date(video.publishedAt).getTime()) /
        (1000 * 60 * 60 * 24);

    let freshnessWeight;

    switch (topic) {

        case "programming":
            freshnessWeight = 10;
            break;

        case "medical":
            freshnessWeight = 12;
            break;

        case "science":
            freshnessWeight = 8;
            break;

        case "history":
            freshnessWeight = 2;
            break;

        default:
            freshnessWeight = 5;
    }

    let freshnessScore;

    if (daysSinceUpload <= 365) {
        freshnessScore = 10;
    } else if (daysSinceUpload <= 730) {
        freshnessScore = 8;
    } else if (daysSinceUpload <= 1095) {
        freshnessScore = 6;
    } else if (daysSinceUpload <= 1825) {
        freshnessScore = 4;
    } else {
        freshnessScore = 2;
    }

    score += (freshnessScore / 10) * freshnessWeight;

    const educationalKeywords = [
        "tutorial",
        "course",
        "explained",
        "beginner",
        "guide",
        "learn",
        "crash course",
        "deep dive",
        "introduction",
        "overview"
    ];

    const hasEducational = educationalKeywords.some(keyword =>
        title.includes(keyword)
    );

    if (hasEducational) score += 2;

    score = addDurationBonus(score, video.duration);

    return Math.min(score, 100);
}

const BASE_THRESHOLDS = {
    tutorial: 10000,
    explanation: 3000,
    comparison: 3000,
    review: 5000,
    documentary: 5000,
    lecture: 2000,
    interview: 2000,
    news: 1000,
    demo: 3000,
    general: 3000
};


export function getMinViews(videos, intent) {
    const baseThreshold = BASE_THRESHOLDS[intent] || BASE_THRESHOLDS.general;
    const count = videos.length;

    let multiplier = 1;

    if (count > 10) {
        multiplier = 1.5; 
    } else if (count < 3) {
        multiplier = 0.7;  
    }

    let threshold = baseThreshold * multiplier;

    const minThreshold = 500;
    const maxThreshold = 50000;
    threshold = Math.min(Math.max(threshold, minThreshold), maxThreshold);

    return Math.round(threshold);
}

export function parseDurationToSeconds(duration) {
    if (!duration) return 0;
    const match = duration.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
    if (!match) return 0;
    const days = parseInt(match[1] || "0");
    const hours = parseInt(match[2] || '0');
    const minutes = parseInt(match[3] || '0');
    const seconds = parseInt(match[4] || '0');
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

const MIN_LONG_FORM_DURATION = 15 * 60;

export function isLongFormVideo(video) {
    if (!video.duration) return false;
    const seconds = parseDurationToSeconds(video.duration);
    return seconds >= MIN_LONG_FORM_DURATION;
}

export function formatDuration(duration) {
    if (!duration) return 'Unknown';
    const total = parseDurationToSeconds(duration);
    if (total === 0) return 'Unknown';

    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (hours > 0) {
        return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
}

export function addDurationBonus(score, duration) {
    if (!duration) return score;
    const seconds = parseDurationToSeconds(duration);

    if (seconds >= 3600) {  
        return score + 3;
    } else if (seconds >= 1800) { 
        return score + 2;
    } else if (seconds >= 900) {  
        return score + 1;
    }
    return score;
}
