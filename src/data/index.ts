/**
 * Typed data entrypoint.
 *
 * Import application data from this module instead of importing the JSON files
 * directly. Optional CMS properties remain visible to TypeScript even when
 * they are not currently present in the underlying JSON.
 */

import rawSite from './site.json';
import rawSocial from './social.json';
import rawGuests from './guests.json';
import rawCities from './ciudades.json';
import { flashCategories } from './flash-categories';
import { artworkCollections } from './artwork-collections';

import type {
  CitiesData,
  GuestsData,
  SiteData,
  SocialData,
} from '../types/content';

export const site: SiteData = rawSite;
export const social: SocialData = rawSocial;
export const guests: GuestsData = rawGuests;
export const cities: CitiesData = rawCities;
export { artworkCollections, flashCategories };

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
  TattoosUi,
  Url,
} from '../types/content';

export type { FlashCategoriesData } from '../types/content';
