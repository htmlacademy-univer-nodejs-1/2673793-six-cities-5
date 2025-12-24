import { CliCommandInterface } from '../common/cli-command/cli-command.interface';

type ParsedCommand = Record<string, string[]>;

const DEFAULT_COMMAND = '--help';

export default class CLIApplication {
  private commands: Record<string, CliCommandInterface> = {};

  private parseCommand(cliArguments: string[]): ParsedCommand {
    const parsedCommands: ParsedCommand = {};
    let currentCommand: string | null = null;

    for (const token of cliArguments) {
      if (!token) {
        continue;
      }

      if (token.startsWith('--')) {
        parsedCommands[token] = [];
        currentCommand = token;
      } else if (currentCommand) {
        parsedCommands[currentCommand].push(token);
      }
    }

    return parsedCommands;
  }

  public getCommand(commandName: string): CliCommandInterface {
    const foundCommand = this.commands[commandName];
    if (foundCommand) {
      return foundCommand;
    }

    const defaultCommand = this.commands[DEFAULT_COMMAND];
    if (defaultCommand) {
      return defaultCommand;
    }

    throw new Error(`Command "${commandName}" is not registered and default command is missing.`);
  }

  public processCommand(argv: string[]): void {
    const parsedCommands = this.parseCommand(argv);
    const parsedCommandKeys = Object.keys(parsedCommands);
    const commandName = parsedCommandKeys.length > 0 ? parsedCommandKeys[0] : DEFAULT_COMMAND;

    try {
      const command = this.getCommand(commandName);
      const commandArguments = parsedCommands[commandName] ?? [];
      command.execute(...commandArguments);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`CLI error: ${error.message}`);
      } else {
        console.error('Unknown CLI error', error);
      }
    }
  }

  public registerCommands(commandsList: CliCommandInterface[]): void {
    for (const cmd of commandsList) {
      this.commands[cmd.name] = cmd;
    }
  }
}
