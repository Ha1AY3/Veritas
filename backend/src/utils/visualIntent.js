export function isExplicitVisualRequest(message) {

    if (!message?.trim()) {
        return false;
    }

    const text = message.toLowerCase();

    const patterns = [
        /\bshow me\b.*\bimage\b/,
        /\bshow me\b.*\bimages\b/,
        /\bshow me\b.*\bdiagram\b/,
        /\bshow me\b.*\bdiagrams\b/,

        /\bgive me\b.*\bimage\b/,
        /\bgive me\b.*\bimages\b/,
        /\bgive me\b.*\bdiagram\b/,
        /\bgive me\b.*\bdiagrams\b/,

        /\bfind\b.*\bimage\b/,
        /\bfind\b.*\bimages\b/,
        /\bfind\b.*\bdiagram\b/,
        /\bfind\b.*\bdiagrams\b/,

        /\bimage(s)?\s+of\b/,
        /\bdiagram(s)?\s+of\b/,

        /\barchitecture diagram\b/,
        /\bworkflow diagram\b/,
        /\bflowchart\b/,
        /\bsequence diagram\b/
    ];

    return patterns.some(pattern => pattern.test(text));
}