// src/lib/gitUtils.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// --- runCommand function remains the same ---
/**
 * Executes a shell command and returns its stdout. Throws error if command fails.
 * @param command The shell command to execute.
 * @returns Promise<string> - The stdout of the command.
 */
async function runCommand(command: string): Promise<string> {
    try {
        // Minimal logging for successful commands unless debugging
        // console.log(`Executing: ${command}`);
        const { stdout, stderr } = await execPromise(command);

        // Git often uses stderr for progress messages (e.g., on commit).
        // Log stderr only if it seems like an actual error or for debugging.
        if (stderr && !stderr.toLowerCase().includes('committed')) { // Basic filter
            // console.warn(`stderr from "${command}": ${stderr.trim()}`); // Maybe silence this too unless debugging
        }
        return stdout.trim();
    } catch (error: any) {
        console.error(`Error executing command: ${command}`);
        // Include stderr in the error message if available, as it often contains the reason for failure
        const errorMessage = error.stderr || error.message || 'Unknown error';
        console.error(`Error message: ${errorMessage.trim()}`);
         if(error.stdout) { // Log stdout too if present on error
             console.error(`stdout: ${error.stdout.trim()}`);
         }
        throw new Error(`Failed to execute command: ${command}. ${errorMessage.trim()}`);
    }
}


// --- stageAllChanges remains the same ---
export async function stageAllChanges(): Promise<void> {
    await runCommand('git add .');
}

// --- getStagedDiff remains the same ---
export async function getStagedDiff(): Promise<string> {
    const diff = await runCommand('git diff --staged --no-color');
    return diff;
}

// --- commitChanges remains the same ---
export async function commitChanges(message: string): Promise<void> {
    const escapedMessage = message.replace(/`/g, '\\`').replace(/"/g, '\\"');
    await runCommand(`git commit -m "${escapedMessage}"`);
}

// --- isGitRepository remains the same ---
export async function isGitRepository(): Promise<boolean> {
     try {
         const output = await runCommand('git rev-parse --is-inside-work-tree');
         return output === 'true';
     } catch (error) {
         return false;
     }
 }

 // --- **** REVISED hasStagedChanges **** ---
 /**
  * Checks if there are any changes staged for commit.
  * Uses `git diff --quiet` which exits with 1 if there are changes, 0 otherwise.
  * This version directly uses execPromise to avoid logging expected non-zero exits as errors.
  * @returns Promise<boolean> - True if changes are staged, false otherwise.
  */
 export async function hasStagedChanges(): Promise<boolean> {
     try {
         // Execute directly, DON'T use runCommand which logs errors on non-zero exit
         await execPromise('git diff --staged --quiet');
         // If the command succeeds (exit code 0), it means NO staged changes.
         return false;
     } catch (error: any) {
         // Check if the error object has a 'code' property and it's 1
         // This indicates that `git diff --quiet` found staged changes.
         if (error && typeof error === 'object' && 'code' in error && error.code === 1) {
             // Exit code 1 means there ARE staged changes. This is the expected "success" case for this check.
             return true;
         }
         // If it's a different error (e.g., git not found, not a repo, other exit code),
         // it's an actual problem. Log it and re-throw or handle appropriately.
         console.error("Unexpected error checking for staged changes:", error.message || error);
         // Re-throw the unexpected error to halt execution in commit.ts
         throw new Error(`Failed to check staged changes: ${error.message || error}`);
     }
 }

