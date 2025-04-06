import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
    stageAllChanges,
    getStagedDiff,
    commitChanges,
    isGitRepository,
    hasStagedChanges
} from '../lib/gitUtils';
import { generateCommitMessageFromDiff } from '../lib/aiUtils';

export function registerCommitCommand(program: Command) {
    program
        .command('commit')
        .description('Automatically stage changes, generate an AI-powered commit message, and commit')
        .action(async () => {
            const spinner = ora({ color: 'cyan' });

            try {
                // Repository check
                spinner.start('Checking if inside a Git repository...');
                if (!(await isGitRepository())) {
                    spinner.fail(chalk.red('❌ Not inside a Git repository. Aborting.'));
                    process.exit(1);
                }
                spinner.stopAndPersist({ symbol: chalk.green('✅'), text: chalk.green('Git repository detected.') });

                // Staging changes
                spinner.start('Staging all changes...');
                await stageAllChanges();
                spinner.stopAndPersist({ symbol: chalk.green('✅'), text: chalk.green('Changes staged.') });

                // Verifying staged changes
                spinner.start('Verifying staged changes...');
                if (!(await hasStagedChanges())) {
                    spinner.stopAndPersist({ symbol: chalk.yellow('⚠️'), text: chalk.yellow('No changes staged. Nothing to commit.') });
                    process.exit(0);
                }
                spinner.stopAndPersist({ symbol: chalk.green('✅'), text: chalk.green('Staged changes confirmed.') });

                // Analyzing diff
                spinner.start('Analyzing staged changes...');
                const diff = await getStagedDiff();
                if (!diff) {
                    spinner.fail(chalk.red('❌ No diff content detected. Cannot generate a commit message.'));
                    process.exit(1);
                }
                spinner.stopAndPersist({ symbol: chalk.green('✅'), text: chalk.green('Staged changes analyzed.') });

                let commitMessage;
                while (true) {
                    // Generating AI-powered commit message
                    spinner.start(chalk.blue('🤖 Generating commit message (this might take a moment)...'));
                    commitMessage = await generateCommitMessageFromDiff(diff);
                    spinner.stopAndPersist({ symbol: chalk.green('✅'), text: chalk.green('Commit message generated successfully.') });

                    // Displaying commit message
                    console.log(chalk.bold('\n✨ Suggested Commit Message:'));
                    console.log(chalk.cyanBright.italic(`\n"${commitMessage}"\n`));

                    // Ask for confirmation
                    const { confirmCommit } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirmCommit',
                            message: 'Do you want to use this commit message?',
                            default: true
                        }
                    ]);

                    if (confirmCommit) break;
                }

                // Committing changes
                spinner.start('Committing changes...');
                await commitChanges(commitMessage);
                spinner.stopAndPersist({ symbol: chalk.green('✅'), text: chalk.green('Changes committed successfully.') });

                console.log(chalk.bold.greenBright('\n🎉 Commit completed successfully!'));
            } catch (error: any) {
                spinner.fail(chalk.red('❌ An error occurred during the commit process.'));
                console.error(chalk.red(`\n🚨 Error: ${error.message}`));
                
                if (error.message?.includes('GEMINI_API_KEY')) {
                    console.error(chalk.yellow('⚠️ Missing or incorrect GEMINI_API_KEY environment variable. Please check your configuration.'));
                }
                process.exit(1);
            }
        });
}