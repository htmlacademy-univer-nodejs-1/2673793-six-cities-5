import { inject, injectable } from 'inversify';
import CreateOfferDto from './dto/create-offer.dto.js';
import { DocumentType, types } from '@typegoose/typegoose';
import { OfferEntity } from './offer.entity.js';
import { OfferServiceInterface } from './offer-service.interface.js';
import { Component } from '../../types/component.enum.js';
import { LoggerInterface } from '../../common/logger/logger.interface.js';
import UpdateOfferDto from './dto/update-offer.dto.js';
import { SortType } from '../../types/sort-type.enum.js';

const MAX_PREMIUM_OFFERS_COUNT = 3;
const MAX_OFFERS_COUNT = 60;

@injectable()
export default class OfferService implements OfferServiceInterface {
  constructor(
    @inject(Component.LoggerInterface) private readonly logger: LoggerInterface,
    @inject(Component.OfferModel) private readonly offerModel: types.ModelType<OfferEntity>
  ) {}

  public async create(dto: CreateOfferDto): Promise<DocumentType<OfferEntity>> {
    const offer = await this.createOffer(dto);
    this.logOfferCreation(dto.name);
    return offer;
  }

  private async createOffer(dto: CreateOfferDto): Promise<DocumentType<OfferEntity>> {
    return this.offerModel.create(dto);
  }

  private logOfferCreation(offerName: string): void {
    this.logger.info(`New offer was created: ${offerName}`);
  }

  public async deleteById(offerId: string): Promise<DocumentType<OfferEntity> | null> {
    return this.deleteOfferById(offerId);
  }

  private async deleteOfferById(offerId: string): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel.findByIdAndDelete(offerId).exec();
  }

  public async find(count: number | undefined): Promise<DocumentType<OfferEntity>[]> {
    const limit = this.resolveOffersLimit(count);
    return this.findOffers(limit);
  }

  private resolveOffersLimit(count?: number): number {
    return count ?? MAX_OFFERS_COUNT;
  }

  private async findOffers(limit: number): Promise<DocumentType<OfferEntity>[]> {
    return this.offerModel
      .find()
      .sort({ createdAt: SortType.Down })
      .populate('userId')
      .limit(limit)
      .exec();
  }

  public async findById(offerId: string): Promise<DocumentType<OfferEntity> | null> {
    return this.findOfferById(offerId);
  }

  private async findOfferById(offerId: string): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel
      .findById(offerId)
      .populate('userId')
      .exec();
  }

  public async findPremiumByCity(city: string): Promise<DocumentType<OfferEntity>[]> {
    return this.findPremiumOffers(city);
  }

  private async findPremiumOffers(city: string): Promise<DocumentType<OfferEntity>[]> {
    return this.offerModel
      .find({ city, premium: true })
      .sort({ createdAt: SortType.Down })
      .limit(MAX_PREMIUM_OFFERS_COUNT)
      .populate('userId')
      .exec();
  }

  public incComment(offerId: string): Promise<DocumentType<OfferEntity> | null> {
    return this.incrementCommentsCount(offerId);
  }

  private incrementCommentsCount(offerId: string): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel
      .findByIdAndUpdate(offerId, { $inc: { commentsCount: 1 } })
      .exec();
  }

  public async updateById(offerId: string, dto: UpdateOfferDto): Promise<DocumentType<OfferEntity> | null> {
    return this.updateOfferById(offerId, dto);
  }

  private async updateOfferById(
    offerId: string,
    dto: UpdateOfferDto
  ): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel
      .findByIdAndUpdate(offerId, dto, { new: true })
      .populate('userId')
      .exec();
  }

  public async addImage(offerId: string, image: string): Promise<void> {
    await this.addOfferImage(offerId, image);
  }

  private async addOfferImage(offerId: string, image: string): Promise<void> {
    await this.offerModel.updateOne({ _id: offerId }, { $addToSet: { images: image } });
  }

  public async removeImage(offerId: string, image: string): Promise<void> {
    await this.removeOfferImage(offerId, image);
  }

  private async removeOfferImage(offerId: string, image: string): Promise<void> {
    await this.offerModel.updateOne({ _id: offerId }, { $pull: { images: image } });
  }

  public async updateRating(offerId: string, rating: number): Promise<void> {
    await this.updateOfferRating(offerId, rating);
  }

  private async updateOfferRating(offerId: string, rating: number): Promise<void> {
    await this.offerModel
      .findByIdAndUpdate(offerId, { rating }, { new: true })
      .exec();
  }

  public async exists(documentId: string): Promise<boolean> {
    return this.checkOfferExists(documentId);
  }

  private async checkOfferExists(documentId: string): Promise<boolean> {
    return (await this.offerModel.exists({ _id: documentId })) !== null;
  }
}
