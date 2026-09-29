import { getExaContents } from "../services/exa/exa.service.js";
import { attachCitationMetadata, generateNotesFromEvidence, generateNotesFurtherReading, generateNotesPlan, getNotesSourceData } from "../services/notes/notes.service.js";
import { generateNotesPdf } from "../services/notes/notesPdf.service.js";

function prepareEvidenceSources(plan, citations) {

    const citationMap = new Map(
        citations.map((citation, index) => [
            `source_${index + 1}`,
            citation
        ])
    );

    const uniqueSources = new Map();

    const sections = plan.sections.map(section => {

        const sourceIds = [];

        for(const sourceId of section.sourceIds){

            const citation = citationMap.get(sourceId);

            if (!citation) {
                throw new Error(`Citation not found for ${sourceId}`);
            }

            sourceIds.push(sourceId);

            if (!uniqueSources.has(citation.url)) {
                uniqueSources.set(citation.url, {
                    ...citation,
                    sourceId
                });
            }
        }

        return {
            title: section.title,
            sourceIds
        };
    });

    return {
        sections,
        sources: [...uniqueSources.values()]
    };
}

export async function generateNotesPdfController(req, res) {
    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        const notesSourceData = await getNotesSourceData(chatId, userId);

        if (!notesSourceData.citations?.length) {
            return res.status(400).json({
                success: false,
                message: "No saved research citations found for this conversation."
            });
        }

        const plan = await generateNotesPlan(notesSourceData);

        const evidenceSources = prepareEvidenceSources(
            plan,
            notesSourceData.citations
        );

        const exaResponse = await getExaContents(
            evidenceSources.sources.map(source => source.url)
        );
        const notes = await generateNotesFromEvidence(
            plan,
            evidenceSources,
            exaResponse
        );

        const notesWithCitations = attachCitationMetadata(
            notes,
            evidenceSources
        );
        const furtherReading = await generateNotesFurtherReading(plan);

        const pdfBuffer = await generateNotesPdf(notesWithCitations, furtherReading);

        const safeTitle = notes.title.replace(/[<>:"/\\|?*]/g, "").trim();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
            "Content-Length": pdfBuffer.length
        });

        return res.send(pdfBuffer);

    } catch (error) {
        console.error("Notes PDF generation failed:");
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate research notes PDF."
        });
    }
}