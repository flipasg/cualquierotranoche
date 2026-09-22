/**
 * Typed data entrypoint.
 *
 * Import JSON-backed application data from this module instead of importing
 * JSON files directly. Explicitly widening each JSON value to its contract
 * means optional CMS properties remain visible to TypeScript as
 * `T | undefined` even when the property is not currently present in the file.
 */

import rawSite from './site.json';
import rawSocial from './social.json';
import rawGuests from './guests.json';
import rawCities from './ciudades.json';
import rawFlashCategories from './flash-categories.json';
import rawArtworkCollections from './obra-collections.json';

import type {
  ArtworkCollectionsData,
  CitiesData,
  FlashCategoriesData,
  GuestsData,
  SiteData,
  SocialData,
} from '../types/content';

export const site: SiteData = rawSite;
export const social: SocialData = rawSocial;
export const guests: GuestsData = rawGuests;
export const cities: CitiesData = rawCities;
export const flashCategories: FlashCategoriesData = rawFlashCategories;
export const artworkCollections: ArtworkCollectionsData = rawArtworkCollections;

export type {
  AboutPageData,
  ArtworkCollection,
  ArtworkCollectionsData,
  ArtworkData,
  ArtworkStatus,
  ArtworkUi,
  CardFrameSizing,
  CarouselUi,
  CitiesData,
  ContactStudioUi,
  ContactUi,
  Cta,
  FlashCategoriesData,
  FlashCategory,
  FlashData,
  FlashStatus,
  FlashUi,
  FooterUi,
  FormsUi,
  GalleryItem,
  GuestEntry,
  GuestsData,
  HeaderLogoUi,
  HeaderUi,
  HomeData,
  HomeDiscipline,
  HomeGuestsCta,
  ImagePath,
  ImageSizingUi,
  IllustrationUi,
  IsoDate,
  MaxWidthSizing,
  NavigationItem,
  ProjectData,
  RequiredCta,
  RichText,
  SeoUi,
  SiteData,
  SiteUi,
  SocialData,
  SocialPageOverride,
  TattooData,
  TattooUi,
  Url,
} from '../types/content';
