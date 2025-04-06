// src/lib/aiUtils.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// REMOVE THIS LINE: import 'dotenv/config'; // Loads .env file if present

const API_KEY = process.env.GEMINI_API_KEY; // This line remains the same - it reads from the environment
const MODEL_NAME = "gemini-1.5-flash-latest"; // Or your preferred model

/**
 * Generates a conventional commit message based on git diff using Gemini AI.
 * @param diff The git diff output.
 * @returns Promise<string> - The generated commit message.
 */
export async function generateCommitMessageFromDiff(diff: string): Promise<string> {
    if (!API_KEY) {
        // The error message is now more direct about the system variable
        throw new Error(
            "GEMINI_API_KEY system environment variable not set. \nPlease get an API key from Google AI Studio (https://aistudio.google.com/) and set it in your environment."
        );
    }
    if (!diff || !diff.trim()) {
        console.warn("generateCommitMessageFromDiff called with an empty diff.");
        return "chore: Empty diff provided";
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const generationConfig = {
            temperature: 0.4,
            topK: 1,
            topP: 1,
            maxOutputTokens: 150,
        };

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        const prompt = `
Analyze the following git diff and generate a concise, informative commit message following the Conventional Commits specification (https://www.conventionalcommits.org/).

The commit message MUST be a single line in the format: <type>[optional scope]: <description>

Common types: feat, fix, build, chore, ci, docs, style, refactor, perf, test. Choose the most appropriate type.
The scope is optional and should describe the section of the codebase affected (e.g., 'auth', 'ui', 'parser').
The description should start with a lowercase letter and provide a succinct summary of the change. Do not end with a period.

Focus on the *semantic* meaning of the changes. Avoid just listing file names. Be specific but brief.

**IMPORTANT: Respond ONLY with the single-line commit message. Do NOT include any other text, explanations, backticks, or formatting around the message.**

Git Diff:
\`\`\`diff
${diff}
\`\`\`

Commit Message:`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
            safetySettings,
        });

        const response = result.response;

        if (!response || response.promptFeedback?.blockReason) {
             const blockReason = response?.promptFeedback?.blockReason ?? 'Unknown safety reason';
             const safetyRatings = response?.promptFeedback?.safetyRatings ?? [];
             console.error("Gemini response blocked.", { blockReason, safetyRatings });
             throw new Error(`Commit message generation blocked by safety settings: ${blockReason}.`);
        }

        const commitMessage = response.text()?.trim();

        if (!commitMessage) {
            console.error("Gemini returned an empty or invalid response. Full response:", JSON.stringify(response, null, 2));
            throw new Error("Gemini returned an empty response.");
        }

        if (!/^[a-z]+(\(.+\))?!?: .+$/.test(commitMessage)) {
            console.warn(`Warning: AI response may not strictly follow Conventional Commit format: "${commitMessage}"`);
        }

        return commitMessage;

    } catch (error: any) {
        console.error("Error communicating with the Gemini API:", error.message);
        if (error.response) {
            console.error("Gemini API Response Error details:", JSON.stringify(error.response, null, 2));
        } else if (error instanceof Error && error.message.includes('FetchError')) {
             console.error("Network error during API call. Check connectivity and ensure GEMINI_API_KEY environment variable is correctly set.");
        } else {
            console.error("Full error object:", error);
        }
        throw new Error(`Failed to generate commit message using AI. Check logs for details. (${error.message})`);
    }
}