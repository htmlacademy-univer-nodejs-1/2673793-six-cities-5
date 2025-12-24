import { CliCommandInterface } from './cli-command.interface.js';
import TSVFileReader from '../file-reader/tsv-file-reader.js';
import { getErrorMessage, getConnectionString } from '../helpers/common.js';
import chalk from 'chalk';
import { createOffer } from '../helpers/offer.js';
import { UserServiceInterface } from '../../modules/user/user-service.interface.js';
import { OfferServiceInterface } from '../../modules/offer/offer-service.interface.js';
import { DatabaseClientInterface } from '../database-client/database-client.interface.js';
import { LoggerInterface } from '../logger/logger.interface.js';
import ConsoleLoggerService from '../logger/console.logger.service.js';
import OfferService from '../../modules/offer/offer.service.js';
import { OfferModel } from '../../modules/offer/offer.entity.js';
import UserService from '../../modules/user/user.service.js';
import { UserModel } from '../../modules/user/user.entity.js';
import MongoClientService from '../database-client/mongo-client.service.js';
import { OfferType } from '../../types/offer.type.js';
import { DEFAULT_USER_PASSWORD, DEFAULT_DB_PORT } from '../helpers/consts.js';

export default class ImportCommand implements CliCommandInterface {
  public readonly name = '--import';
  private userService!: UserServiceInterface;
  private offerService!: OfferServiceInterface;
  private databaseService!: DatabaseClientInterface;
  private readonly logger: LoggerInterface;
  private salt!: string;

  constructor() {
    this.handleRow = this.handleRow.bind(this);
    this.handleComplete = this.handleComplete.bind(this);

    this.logger = new ConsoleLoggerService();
    this.offerService = new OfferService(this.logger, OfferModel);
    this.userService = new UserService(this.logger, UserModel, OfferModel);
    this.databaseService = new MongoClientService(this.logger);
  }

  private async saveOffer(offer: OfferType): Promise<void> {
    const user = await this.userService.findOrCreate(
      {
        ...offer.offerAuthor,
        password: DEFAULT_USER_PASSWORD
      },
      this.salt
    );

    await this.offerService.create({
      ...offer,
      userId: user.id
    });
  }

  private async handleRow(line: string, resolve: VoidFunction): Promise<void> {
    const offer = createOffer(line);
    await this.saveOffer(offer);
    resolve();
  }

  private handleComplete(count: number): void {
    this.logger.info(`${count} строк импортировано`);
    this.databaseService.disconnect();
  }

  public async execute(...parameters: string[]): Promise<void> {
    const [filePath, login, password, host, dbName, salt] = parameters;
    const dbUri = getConnectionString(login, password, host, DEFAULT_DB_PORT, dbName);
    this.salt = salt;

    await this.databaseService.connect(dbUri);
    const fileReader = new TSVFileReader(filePath.trim());
    fileReader.on('row', this.handleRow);
    fileReader.on('end', this.handleComplete);

    try {
      await fileReader.read();
    } catch (err) {
      this.logger.error(`${chalk.redBright(`Не вышло прочитать файл. Ошибка: ${getErrorMessage(err)}`)}`);
    }
  }
}
