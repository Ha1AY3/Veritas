import PDFDocument from "pdfkit";

function renderInlineText(doc, text) {

    text = text.replace(/→/g, "->").replace(/⇒/g, "=>").replace(/↔/g, "<->");

    const parts = text.split(/(`[^`]+`)/g);

    parts.forEach((part, index) => {

        if (!part) return;

        const isCode = part.startsWith("`") && part.endsWith("`");

        if (isCode) {

            const code = part.slice(1, -1);

            doc
                .font("Courier-Bold")
                .fontSize(10.5)
                .fillColor("#374151")
                .text(code, {
                    continued: index < parts.length - 1
                });

        } else {

            doc
                .font("Helvetica")
                .fontSize(11)
                .fillColor("#111827")
                .text(part, {
                    continued: index < parts.length - 1
                });
        }
    });
}

function renderMathBlock(doc, equation) {
    const paddingX = 12;
    const paddingY = 9;
    const lineHeight = 16;

    const lines = equation.trim().split("\n").map(line => line.trim()).filter(Boolean);

    const height = lines.length * lineHeight + paddingY * 2;

    const x = doc.page.margins.left;

    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const availableHeight = doc.page.height - doc.page.margins.bottom - doc.y;

    if (availableHeight < height + 20) {
        doc.addPage();
    }

    const finalY = doc.y;

    doc
        .save()
        .roundedRect(x, finalY, width, height, 7)
        .fill("#F8FAFC")
        .restore();

    doc
        .font("Courier-Bold")
        .fontSize(10.5)
        .fillColor("#111827")
        .text(lines.join("\n"), x + paddingX, finalY + paddingY,
            {
                width: width - paddingX * 2,
                align: "center",
                lineGap: 1
            }
        );

    doc.y = finalY + height + 7;
}

function renderCodeBlock(doc, code, language = "") {
    const codeLines = code.trim().split("\n");

    const lineHeight = 14;
    const padding = 14;
    const height = codeLines.length * lineHeight + padding * 2;

    const x = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const availableHeight = doc.page.height - doc.page.margins.bottom - doc.y;

    if (availableHeight < height + 30) {
        doc.addPage();
    }

    const finalY = doc.y;

    doc
        .save()
        .roundedRect(x, finalY, width, height, 8)
        .fill("#F3F4F6")
        .restore();

    doc
        .font("Courier")
        .fontSize(9.5)
        .fillColor("#374151")
        .text(
            codeLines.join("\n"),
            x + padding,
            finalY + padding,
            {
                width: width - padding * 2,
                lineGap: 2
            }
        );

    doc.y = finalY + height + 12;
}

function renderNote(doc, item, options = {}) {

    const { renderCitations = true } = options;

    const text = item.text || "";
    const segments = text.split(/(```[\s\S]*?```)/g);

    segments.forEach(segment => {

        if (!segment.trim()) {
            return;
        }

        if (segment.startsWith("```")) {

            const lines = segment.split("\n");

            const language = lines[0].replace(/```/g, "").trim();

            const code = lines.slice(1, -1).join("\n");

            if (language === "math") {
                renderMathBlock(doc, code);
            } else {
                renderCodeBlock(doc, code, language);
            }

            return;
        }

        renderInlineText(doc, segment.trim());
    });

    if (renderCitations && Array.isArray(item.citations) && item.citations.length > 0) {
        item.citations.forEach((citation, index) => {

            const prefix = index === 0 ? " (" : ", ";

            const suffix = index === item.citations.length - 1 ? ")" : "";

            doc
                .font("Helvetica")
                .fontSize(9.5)
                .fillColor("#2563EB")
                .text(
                    `${prefix}${citation.hostname}${suffix}`,
                    {
                        link: citation.url,
                        underline: false,
                        continued: index !== item.citations.length - 1
                    }
                );
        });
    }

    doc
        .fillColor("#111827")
        .font("Helvetica")
        .fontSize(11)
        .moveDown(0.8);
}

function getCitationKey(citations = []) {
    return [...new Set(citations
        .map(citation => citation.url)
        .filter(Boolean)
    )].sort().join("|");
}

function getUniqueCitations(citations = []) {
    const seenHosts = new Set();

    return citations.filter(citation => {
        if (!citation?.url || !citation?.hostname) {
            return false;
        }

        if (seenHosts.has(citation.hostname)) {
            return false;
        }

        seenHosts.add(citation.hostname);
        return true;
    });
}

function renderSectionContent(doc, content = []) {

    let i = 0;

    while (i < content.length) {

        const currentItem = content[i];

        const currentKey = getCitationKey(currentItem.citations);

        const group = [currentItem];

        let j = i + 1;

        while (j < content.length) {

            const nextItem = content[j];

            const nextKey = getCitationKey(nextItem.citations);

            if (nextKey !== currentKey) {
                break;
            }

            group.push(nextItem);
            j++;
        }

        group.forEach(item => {
            renderNote(doc, item, {
                renderCitations: false
            });
        });

        if (group.length > 0 && group[0].citations?.length > 0) {

            const uniqueCitations = getUniqueCitations(
                group.flatMap(item => item.citations || [])
            );

            doc.font("Helvetica").fontSize(9.5);

            const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

            const citationText = `(${uniqueCitations
                .map(citation => citation.hostname).join(", ")})`;

            const citationWidth = doc.widthOfString(citationText);

            if (citationWidth > availableWidth) {
                doc.addPage();
            }

            doc.fillColor("#2563EB").text("(", {
                continued: true
            });

            uniqueCitations.forEach((citation, index) => {
                doc
                    .fillColor("#2563EB")
                    .text(citation.hostname, {
                        link: citation.url,
                        underline: false,
                        continued: true
                    });

                if (index < uniqueCitations.length - 1) {
                    doc.text(", ", {
                        continued: true
                    });
                }
            });

            doc
                .fillColor("#2563EB")
                .text(")");

            doc
                .fillColor("#111827")
                .moveDown(0.8);

        }

        i = j;
    }
}

function renderResourceCard(doc, resource, typeLabel) {
    const title = resource.displayTitle || resource.title || resource.hostname || "Resource";

    const hostname = resource.hostname || "";

    const x = 50;
    const width = 495;

    const titleFontSize = 11;
    const hostnameFontSize = 9.5;
    const titleWidth = width - 36;

    doc
        .font("Helvetica-Bold")
        .fontSize(titleFontSize);

    const titleHeight = doc.heightOfString(title, {
        width: titleWidth,
        lineGap: 2
    });

    const cardHeight = 62 + titleHeight;

    const availableHeight = doc.page.height - doc.page.margins.bottom - doc.y;

    if (availableHeight < cardHeight + 20) {
        doc.addPage();
    }

    const cardY = doc.y;

    doc
        .save()
        .roundedRect(x, cardY, width, cardHeight, 10)
        .fill("#F8FAFC")
        .restore();

    doc
        .save()
        .roundedRect(x, cardY, 4, cardHeight, 2)
        .fill("#7C3AED")
        .restore();

    doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#7C3AED")
        .text(
            typeLabel.toUpperCase(),
            x + 18,
            cardY + 12
        );

    doc
        .font("Helvetica-Bold")
        .fontSize(titleFontSize)
        .fillColor("#111827")
        .text(title, x + 18, cardY + 26,
            {
                width: titleWidth,
                link: resource.url,
                underline: false,
                lineGap: 2
            }
        );

    doc
        .font("Helvetica")
        .fontSize(hostnameFontSize)
        .fillColor("#2563EB")
        .text(hostname, x + 18, cardY + 31 + titleHeight,
            {
                link: resource.url,
                underline: false
            }
        );

    doc.y = cardY + cardHeight + 12;
}

export function generateNotesPdf(notes, furtherReading = []) {

    if (!notes?.title || !Array.isArray(notes.sections)) {
        throw new Error("Invalid notes data");
    }

    return new Promise((resolve, reject) => {

        const doc = new PDFDocument({
            size: "A4",
            margin: 50,
            bufferPages: true
        });

        const chunks = [];

        doc.on("data", chunk => {
            chunks.push(chunk);
        });

        doc.on("end", () => {
            resolve(Buffer.concat(chunks));
        });

        doc.on("error", reject);

        doc
            .font("Helvetica-Bold")
            .fontSize(23)
            .fillColor("#111827")
            .text(notes.title, {
                align: "left",
                lineGap: 4
            });

        doc.moveDown(0.5);

        doc
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .lineWidth(1)
            .strokeColor("#E5E7EB")
            .stroke();

        doc.moveDown(1.5);

        notes.sections.forEach((section, sectionIndex) => {

            doc
                .font("Helvetica-Bold")
                .fontSize(16)
                .fillColor("#111827")
                .text(section.title);

            doc.moveDown(0.35);

            doc
                .moveTo(50, doc.y)
                .lineTo(115, doc.y)
                .lineWidth(2)
                .strokeColor("#7C3AED")
                .stroke();

            doc.moveDown(0.8);

            renderSectionContent(doc, section.content);

            if (sectionIndex < notes.sections.length - 1) {
                doc.moveDown(0.6);
            }
        });

        if (Array.isArray(furtherReading) && furtherReading.length > 0) {
            doc.addPage();

            doc
                .font("Helvetica-Bold")
                .fontSize(22)
                .fillColor("#111827")
                .text("Further Reading");

            doc.moveDown(0.35);

            doc
                .moveTo(50, doc.y)
                .lineTo(105, doc.y)
                .lineWidth(2.5)
                .strokeColor("#7C3AED")
                .stroke();

            doc.moveDown(0.5);

            doc
                .font("Helvetica")
                .fontSize(10.5)
                .fillColor("#6B7280")

            doc.moveDown(1.4);

            const groups = [
                {
                    type: "documentation",
                    title: "Documentation"
                },
                {
                    type: "video",
                    title: "Videos"
                },
                {
                    type: "research_paper",
                    title: "Research Papers"
                }
            ];

            groups.forEach(group => {

                const resources = furtherReading.filter(
                    resource => resource.source_type === group.type
                );

                if (resources.length === 0) {
                    return;
                }
                doc
                    .font("Helvetica-Bold")
                    .fontSize(13.5)
                    .fillColor("#111827")
                    .text(group.title);

                doc.moveDown(0.25);

                doc
                    .moveTo(50, doc.y)
                    .lineTo(90, doc.y)
                    .lineWidth(2)
                    .strokeColor("#7C3AED")
                    .stroke();

                doc.moveDown(0.8);

                resources.forEach(resource => {
                    renderResourceCard(
                        doc,
                        resource,
                        group.title.slice(0, -1)
                    );
                });

                doc.moveDown(0.5);
            });
        }
        const range = doc.bufferedPageRange();

        for (let page = range.start; page < range.start + range.count; page++) {

            doc.switchToPage(page);

            const footerY = 770;

            doc
                .moveTo(50, footerY - 8)
                .lineTo(545, footerY - 8)
                .lineWidth(0.5)
                .strokeColor("#E5E7EB")
                .stroke();

            doc
                .font("Helvetica")
                .fontSize(8)
                .fillColor("#9CA3AF")
                .text(`Veritas - Research Notes    ${page + 1}`, 50, footerY,
                    {
                        width: 495,
                        align: "center",
                        lineBreak: false
                    }
                );
        }

        doc.end();
    });
}