// src/index.ts
import { program } from 'commander';
import { registerCommitCommand } from './commands/commit'; // <-- Import the new command
import { version as cliVersion } from '../package.json'; // <-- Use 'require' or ensure JSON imports work

async function main() {
    program
        .version(cliVersion || 'unknown') // Handle potential import issues
        .name("git-cli")
        .description('A CLI tool extending Git capabilities, e.g., with AI-powered commits.');

    // Register all commands    
    registerCommitCommand(program); // <-- Register the commit command

    // Improved command handling
    program.on('command:*', (operands) => {
        console.error(`❌ Error: Invalid command '${operands[0]}'.`);
        console.log('See --help for a list of available commands.');
        process.exit(1);
    });

    // Parse arguments
    await program.parseAsync(process.argv);

    // Show help if no command was provided (and no relevant options like --version)
    // Commander implicitly handles showing help for -h/--help and version for -V/--version
    // We only need to explicitly show help if no arguments (beyond node + script path) are given.
    if (process.argv.slice(2).length === 0) {
        program.outputHelp();
    }

    // Note: Commander's default behavior usually handles unknown commands
    // and showing help correctly. The extra checks might be redundant unless
    // specific edge cases need handling. The 'command:*' listener is often sufficient.
}

main().catch(error => {
    console.error("\n❌ An unexpected error occurred:");
    // Print the error message, potentially excluding the stack trace for cleaner output
    // unless in a debug mode.
    if (error instanceof Error) {
        console.error(error.message);
        // console.error(error.stack); // Uncomment for debugging
    } else {
        console.error(error);
    }
    process.exit(1);
});