

function isHostname(value) {
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
}

function processOutsideCodeBlocks(text, processor) {
  const codeBlocks = [];

  const protectedText = text.replace(
    /```[\s\S]*?```/g,
    match => {
      const index = codeBlocks.length;
      codeBlocks.push(match);
      return `@@CODE_BLOCK_${index}@@`;
    }
  );

  const processedText = processor(protectedText);

  return processedText.replace(
    /@@CODE_BLOCK_(\d+)@@/g,
    (_, index) => codeBlocks[Number(index)]
  );
}

export function normalizeCitations(text) {
  if (!text) return text;

  return processOutsideCodeBlocks(text, textWithoutCode => {
    return textWithoutCode.replace(
      /[\[(]\s*([^\])]+?)\s*[\])]/g,
      (match, content) => {
        const hosts = content
          .split(",")
          .map(h => h.trim());

        if (!hosts.every(isHostname)) {
          return match;
        }

        const uniqueHosts = [...new Set(hosts)];

        return `(${uniqueHosts.join(", ")})`;
      }
    );
  });
}

export function convertCitationsToMarkdown(answer, citations) {
  const citationMap = new Map();

  citations.forEach(c => {
    citationMap.set(c.hostname, c.url);
  });

  return processOutsideCodeBlocks(answer, textWithoutCode => {
    return textWithoutCode.replace(
      /\((\[?[a-zA-Z0-9./:-]+\]?(?:,\s*\[?[a-zA-Z0-9./:-]+\]?)*?)\)/g,
      (_, hosts) => {
        const uniqueHosts = [
          ...new Set(
            hosts
              .split(",")
              .map(host => {
                return host
                  .replace(/[\[\]]/g, "")
                  .replace(/^https?:\/\//, "")
                  .split("/")[0]
                  .trim();
              })
          )
        ];

        const links = uniqueHosts.map(host => {
          const url = citationMap.get(host);

          return url ? `[${host}](${url})` : host;
        });

        return links.join(", ");
      }
    );
  });
}

export function normalizeCodeBlocks(text) {
  if (!text) return text;

  return text.replace(
    /(^|\n)(javascript|js|jsx|typescript|ts|python|java|bash|json)\n([\s\S]*?)(?=\n\n\([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:,\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})*\)|\n\n\*\*|$)/g,
    (_, prefix, language, code) => {
      return `${prefix}\`\`\`${language}\n${code.trim()}\n\`\`\`\n`;
    }
  );
}

