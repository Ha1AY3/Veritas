import * as cheerio from "cheerio";

const MAX_IMAGES_PER_PAGE = 20;

function resolveImageUrl(src, sourceUrl) {

    if (!src) {
        return null;
    }

    if (src.startsWith("data:")) {
        return null;
    }

    try {
        return new URL(src, sourceUrl).href;
    } catch {
        return null;
    }
}

function getBestSrcsetUrl(srcset) {

    if (!srcset) {
        return null;
    }

    const candidates = srcset
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => {

            const parts = item.split(/\s+/);

            return {
                url: parts[0],
                descriptor: parts[1] || ""
            };
        });

    if (!candidates.length) {
        return null;
    }

    candidates.sort((a, b) => {

        const aMatch = a.descriptor.match(/(\d+)(w|x)/);

        const bMatch = b.descriptor.match(/(\d+)(w|x)/);

        const aValue = aMatch ? Number(aMatch[1]) : 0;

        const bValue = bMatch ? Number(bMatch[1]) : 0;

        return bValue - aValue;
    });

    return candidates[0].url;
}

function getImageTitle($, element) {

    const alt = $(element).attr("alt");

    if (alt?.trim()) {
        return alt.trim();
    }

    const title = $(element).attr("title");

    if (title?.trim()) {
        return title.trim();
    }

    const caption = $(element).closest("figure").find("figcaption").first().text().trim();

    if (caption) {
        return caption;
    }

    return "";
}

function getNearbyText($, element) {

    const figure = $(element).closest("figure");

    if (figure.length) {

        return figure.text().replace(/\s+/g, " ").trim().slice(0, 500);
    }

    return "";
}

export async function extractPageImages(sourceUrl) {

    if (!sourceUrl) {
        return [];
    }

    try {
        const response = await fetch(
            sourceUrl,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36",

                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                },
                redirect: "follow",
                signal: AbortSignal.timeout(10000)
            }
        );

        if (!response.ok) {
            return [];
        }

        const contentType = (response.headers.get("content-type") || "").toLowerCase();

        if (!contentType.includes("text/html")) {

            return [];
        }

        const html = await response.text();

        const $ = cheerio.load(html);

        const images = [];

        const seen = new Set();

        $("img").each((_, element) => {

                if( images.length >= MAX_IMAGES_PER_PAGE){
                    return;
                }

                const src =
                    $(element).attr("src") ||
                    $(element).attr("data-src") ||
                    $(element).attr("data-lazy-src") ||
                    $(element).attr("data-original");

                const srcset =
                    $(element).attr("srcset") ||
                    $(element).attr("data-srcset") ||
                    $(element).attr("data-lazy-srcset");

                const bestSrcset = getBestSrcsetUrl(srcset);

                const selectedSrc = bestSrcset || src;

                const imageUrl = resolveImageUrl(selectedSrc,sourceUrl);

                if (!imageUrl) {
                    return;
                }

                if (seen.has(imageUrl)) {
                    return;
                }

                seen.add(imageUrl);

                const width = Number($(element).attr("width")) || 0;

                const height = Number($(element).attr("height")) || 0;

                images.push({
                    imageUrl,
                    title: getImageTitle($,element),
                    alt: $(element).attr("alt") || "",
                    nearbyText: getNearbyText($, element),
                    width,
                    height,
                    sourceUrl,
                    hostname: getHostname(sourceUrl)
                });
            }
        );

        return images;

    } catch (error) {

        console.error("Page image extraction failed:", error.message);

        return [];
    }
}

function getHostname(url = "") {

    try {

        return new URL(url)
            .hostname
            .replace(/^www\./, "");

    } catch {

        return "";
    }
}